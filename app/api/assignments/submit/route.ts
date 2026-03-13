import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureValidCsrf } from '@/lib/security/csrf'
import { canUserAccessClassroom } from '@/lib/security/role-scope'
import {
  autoGradeQuizSubmission,
  buildJudgeFeedback,
  getAssignmentAvailability,
  parseQuizQuestions,
  parseQuizSubmission,
} from '@/lib/assignment-workflow'
import { runSandboxJudge } from '@/lib/judge/service'
import { normalizeTestCases } from '@/lib/judge/shared'

export async function POST(request: Request) {
  try {
    const csrfError = ensureValidCsrf(request)
    if (csrfError) return csrfError

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'student') {
      return NextResponse.json({ error: 'Only students can submit assignments' }, { status: 403 })
    }

    const body = await request.json()
    const assignmentId = String(body.assignmentId || '').trim()
    const code = String(body.code || '')

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 })
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select(
        'id, classroom_id, title, language, due_date, starter_code, test_cases, is_visible, visible_from, visible_until',
      )
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const isAuthorized = await canUserAccessClassroom(supabase, user.id, String(assignment.classroom_id))
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const availability = getAssignmentAvailability(assignment)
    if (availability.state !== 'open') {
      return NextResponse.json(
        { error: availability.detail || 'This assignment is not currently accepting submissions.' },
        { status: 400 },
      )
    }

    if (!code.trim()) {
      return NextResponse.json({ error: 'Submission content is required' }, { status: 400 })
    }

    let score: number | null = null
    let feedback: string | null = null
    let status: 'submitted' | 'graded' = 'submitted'
    let gradedAt: string | null = null
    let results: unknown[] = []
    let autoGraded = false

    if (assignment.language === 'quiz') {
      const questions = parseQuizQuestions(assignment.test_cases)
      const summary = autoGradeQuizSubmission(questions, parseQuizSubmission(code))
      score = summary.score
      feedback = summary.feedback
      status = 'graded'
      gradedAt = new Date().toISOString()
      results = summary.lineItems
      autoGraded = true
    } else {
      const tests = normalizeTestCases(assignment.test_cases)
      if (tests.length > 0) {
        const judge = await runSandboxJudge({
          language: String(assignment.language || 'python'),
          code,
          tests,
          context: { source: 'assignment', sourceId: assignmentId, userId: user.id },
        })

        const visibleResults = judge.results.filter((result) => {
          const source = tests.find((test) => test.id === result.id)
          return !source?.hidden
        })
        const resultsForUi = visibleResults.length > 0 ? visibleResults : judge.results
        const passedCount = judge.results.filter((result) => result.passed).length
        score = judge.results.length > 0 ? Math.round((passedCount / judge.results.length) * 100) : 0
        feedback = buildJudgeFeedback(resultsForUi, score, judge.results.length)
        status = 'graded'
        gradedAt = new Date().toISOString()
        results = resultsForUi
        autoGraded = true
      } else {
        feedback = 'Submitted for teacher review.'
      }
    }

    const submittedAt = new Date().toISOString()
    const payload = {
      assignment_id: assignmentId,
      student_id: user.id,
      code,
      status,
      score,
      feedback,
      submitted_at: submittedAt,
      graded_at: gradedAt,
    }

    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .upsert(payload, { onConflict: 'assignment_id,student_id' })
      .select()
      .single()

    if (submissionError) {
      return NextResponse.json({ error: submissionError.message || 'Failed to save submission' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      autoGraded,
      results,
      submission,
      availability,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to submit assignment' }, { status: 500 })
  }
}
