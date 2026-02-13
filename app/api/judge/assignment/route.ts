import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureValidCsrf } from '@/lib/security/csrf'
import { normalizeTestCases, runSandboxJudge } from '@/lib/judge/service'

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

    const body = await request.json()
    const assignmentId = String(body.assignmentId || '').trim()
    const code = String(body.code || '')

    if (!assignmentId || !code.trim()) {
      return NextResponse.json({ error: 'assignmentId and code are required' }, { status: 400 })
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('id, classroom_id, language, test_cases')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const [{ data: profile }, { data: enrollment }, { data: classroom }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      supabase
        .from('enrollments')
        .select('id')
        .eq('classroom_id', assignment.classroom_id)
        .eq('student_id', user.id)
        .maybeSingle(),
      supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', assignment.classroom_id)
        .maybeSingle(),
    ])

    const role = profile?.role || ''
    const isPrivileged = ['teacher', 'full_admin', 'district_admin', 'school_admin'].includes(role)
    const isAuthorized = Boolean(enrollment) || (isPrivileged && classroom?.teacher_id === user.id) || ['full_admin', 'district_admin', 'school_admin'].includes(role)

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tests = normalizeTestCases(assignment.test_cases)
    if (tests.length === 0) {
      return NextResponse.json({ error: 'No test cases configured for this assignment' }, { status: 400 })
    }

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
    const passedCount = resultsForUi.filter((test) => test.passed).length
    const totalCount = resultsForUi.length
    const score = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0
    const passed = totalCount > 0 && passedCount === totalCount

    return NextResponse.json({
      results: resultsForUi,
      tests: resultsForUi,
      passed,
      passedCount,
      total: totalCount,
      score,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to run tests' }, { status: 500 })
  }
}
