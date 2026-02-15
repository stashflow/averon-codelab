'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, CheckCircle2, Clock, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

type QuizQuestion = {
  prompt: string
  options: string[]
  correctIndex: number
  explanation?: string
  points?: number
}

type QuizSubmissionPayload = {
  answers?: number[]
}

function parseQuizQuestions(testCases: unknown): QuizQuestion[] {
  if (!Array.isArray(testCases)) return []
  return testCases
    .map((item: any) => ({
      prompt: String(item?.prompt || ''),
      options: Array.isArray(item?.options) ? item.options.map((option: unknown) => String(option || '')) : [],
      correctIndex: Number.isFinite(Number(item?.correctIndex)) ? Number(item.correctIndex) : 0,
      explanation: String(item?.explanation || ''),
      points: Number.isFinite(Number(item?.points)) ? Number(item.points) : 1,
    }))
    .filter((item) => item.prompt && item.options.length >= 2)
}

function parseQuizSubmission(code: string | null | undefined): QuizSubmissionPayload {
  try {
    return JSON.parse(String(code || '{}')) as QuizSubmissionPayload
  } catch {
    return {}
  }
}

export default function TeacherAssignmentPage() {
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string

  const [assignment, setAssignment] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [gradeScore, setGradeScore] = useState('')
  const [gradeFeedback, setGradeFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      try {
        const {
          data: { user: authUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !authUser) {
          router.push('/auth/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single()

        if (profile?.role !== 'teacher') {
          router.push('/protected')
          return
        }

        // Load assignment
        const { data: assignmentData } = await supabase
          .from('assignments')
          .select('*, classroom:classroom_id(teacher_id), test_cases, language')
          .eq('id', assignmentId)
          .single()

        if (!assignmentData || assignmentData.classroom?.teacher_id !== authUser.id) {
          router.push('/protected/teacher')
          return
        }

        setAssignment(assignmentData)

        // Load all submissions for this assignment
        const { data: submissionData } = await supabase
          .from('submissions')
          .select('*, profiles(email, full_name)')
          .eq('assignment_id', assignmentId)
          .order('created_at', { ascending: false })

        setSubmissions(submissionData || [])

        if (submissionData && submissionData.length > 0) {
          setSelectedSubmission(submissionData[0])
          setGradeScore(submissionData[0].score?.toString() || '')
          setGradeFeedback(submissionData[0].feedback || '')
        }
      } catch (err: any) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
    const intervalId = window.setInterval(() => {
      void loadData()
    }, 15000)

    return () => window.clearInterval(intervalId)
  }, [assignmentId])

  const gradingStats = useMemo(() => {
    const graded = submissions.filter((submission) => submission.status === 'graded')
    const working = submissions.filter((submission) => submission.status === 'pending')
    const pending = submissions.filter((submission) => submission.status === 'submitted' || submission.status === 'pending')
    const gradeScores = graded
      .map((submission) => submission.score)
      .filter((score: unknown): score is number => typeof score === 'number')
    const average = gradeScores.length > 0 ? Math.round(gradeScores.reduce((sum, score) => sum + score, 0) / gradeScores.length) : 0
    return { graded: graded.length, pending: pending.length, working: working.length, average }
  }, [submissions])

  const orderedSubmissions = useMemo(() => {
    const rank = (status: string | null | undefined) => {
      if (status === 'pending') return 0
      if (status === 'submitted') return 1
      if (status === 'graded') return 2
      return 3
    }
    return [...submissions].sort((a, b) => rank(a.status) - rank(b.status))
  }, [submissions])

  const isQuizAssignment = assignment?.language === 'quiz'
  const quizQuestions = useMemo(() => parseQuizQuestions(assignment?.test_cases), [assignment?.test_cases])

  function autoGradeQuiz(submission: any): { score: number; feedback: string } | null {
    if (!isQuizAssignment || quizQuestions.length === 0) return null
    const payload = parseQuizSubmission(submission?.code)
    const answers = Array.isArray(payload.answers) ? payload.answers : []
    let earned = 0
    let possible = 0

    const lineItems = quizQuestions.map((question, index) => {
      const points = Math.max(1, Number(question.points) || 1)
      possible += points
      const selected = Number.isFinite(Number(answers[index])) ? Number(answers[index]) : -1
      const correct = selected === question.correctIndex
      if (correct) earned += points
      return `${correct ? 'Correct' : 'Incorrect'} Q${index + 1}`
    })

    const score = possible > 0 ? Math.round((earned / possible) * 100) : 0
    const feedback = `Auto-graded quiz. ${lineItems.join(' | ')}`
    return { score, feedback }
  }

  async function handleGradeSubmission() {
    if (!selectedSubmission) return

    setSaving(true)

    const supabase = createClient()
    try {
      const auto = autoGradeQuiz(selectedSubmission)
      const parsedScore = Number(gradeScore)
      const normalizedScore = auto
        ? auto.score
        : Number.isFinite(parsedScore)
          ? Math.max(0, Math.min(100, Math.round(parsedScore)))
          : 0
      const normalizedFeedback = auto ? auto.feedback : gradeFeedback

      const { error } = await supabase
        .from('submissions')
        .update({
          score: normalizedScore,
          feedback: normalizedFeedback,
          status: 'graded',
          graded_at: new Date().toISOString(),
        })
        .eq('id', selectedSubmission.id)

      if (error) throw error

      // Update local state
      setSelectedSubmission({
        ...selectedSubmission,
        score: normalizedScore,
        feedback: normalizedFeedback,
        status: 'graded',
      })

      // Update submissions list
      setSubmissions(
        submissions.map((s) =>
          s.id === selectedSubmission.id
            ? {
                ...s,
                score: normalizedScore,
                feedback: normalizedFeedback,
                status: 'graded',
              }
            : s
        )
      )

      setGradeScore(String(normalizedScore))
      setGradeFeedback(normalizedFeedback)
      alert('Grade saved successfully!')
    } catch (err: any) {
      alert('Error saving grade: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950">
        <p className="text-slate-300">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950">
      <header className="border-b border-white/5 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-200 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Grade Submissions</h1>
            <p className="text-sm text-slate-400">{assignment?.title}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Card className="border-white/10 bg-white/5">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-400">Pending Grading</p>
              <p className="text-2xl font-semibold text-white">{gradingStats.pending}</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-400">Currently Working</p>
              <p className="text-2xl font-semibold text-white">{gradingStats.working}</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-400">Graded</p>
              <p className="text-2xl font-semibold text-white">{gradingStats.graded}</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-400">Assignment Average</p>
              <p className="text-2xl font-semibold text-white">{gradingStats.average}%</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Submissions List */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h2 className="text-lg font-semibold text-white mb-3">Submissions</h2>
              <div className="space-y-2">
                {orderedSubmissions.length === 0 ? (
                  <p className="text-sm text-slate-400">No submissions yet</p>
                ) : (
                  orderedSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className={`cursor-pointer transition-colors rounded-2xl backdrop-blur-xl border p-4 ${selectedSubmission?.id === submission.id ? 'border-blue-400/50 bg-gradient-to-br from-blue-500/20 to-blue-500/10' : 'border-white/10 bg-gradient-to-br from-white/10 to-white/5 hover:border-blue-400/30'}`}
                      onClick={() => {
                        setSelectedSubmission(submission)
                        setGradeScore(submission.score?.toString() || '')
                        setGradeFeedback(submission.feedback || '')
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{submission.profiles?.full_name}</p>
                          <p className="text-xs text-slate-400 truncate">{submission.profiles?.email}</p>
                        </div>
                        {submission.status === 'graded' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                        {submission.status === 'submitted' && <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                        {submission.status === 'pending' && <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        {submission.status === 'pending'
                          ? 'Currently working'
                          : submission.status === 'submitted'
                            ? 'Ready to grade'
                            : 'Graded'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Grading Interface */}
          <div className="lg:col-span-3">
            {selectedSubmission ? (
              <div className="space-y-6">
                {/* Code Display */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white">Student Code</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        Last activity: {new Date(selectedSubmission.submitted_at || selectedSubmission.updated_at || selectedSubmission.created_at).toLocaleString()}
                      </p>
                    </div>
                    <pre className="bg-slate-950/50 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono text-slate-200 border border-white/10">
                      {selectedSubmission.code}
                    </pre>
                    {isQuizAssignment && quizQuestions.length > 0 && (
                      <div className="rounded-lg border border-white/10 bg-slate-950/40 p-4 space-y-2">
                        <p className="text-sm font-medium text-white">Quiz Response Review</p>
                        {quizQuestions.map((question, index) => {
                          const payload = parseQuizSubmission(selectedSubmission.code)
                          const selected = Array.isArray(payload.answers) ? Number(payload.answers[index]) : -1
                          const isCorrect = selected === question.correctIndex
                          return (
                            <div key={`review-${index}`} className="text-sm text-slate-200">
                              <p className="font-medium">Q{index + 1}: {question.prompt}</p>
                              <div className="mt-1 space-y-1">
                                {question.options.map((option, optionIndex) => (
                                  <p
                                    key={`review-opt-${index}-${optionIndex}`}
                                    className={
                                      optionIndex === question.correctIndex
                                        ? 'text-emerald-300'
                                        : optionIndex === selected
                                          ? 'text-orange-300'
                                          : 'text-slate-300'
                                    }
                                  >
                                    {optionIndex + 1}. {option}
                                    {optionIndex === question.correctIndex ? ' (correct)' : ''}
                                    {optionIndex === selected ? ' (selected)' : ''}
                                  </p>
                                ))}
                              </div>
                              <p className={isCorrect ? 'text-emerald-300' : 'text-orange-300'}>
                                Selected: {selected >= 0 ? question.options[selected] || `Option ${selected + 1}` : 'No answer'}
                              </p>
                              <p className="text-cyan-200">Correct: {question.options[question.correctIndex] || `Option ${question.correctIndex + 1}`}</p>
                              {question.explanation && <p className="text-xs text-slate-400">Explanation: {question.explanation}</p>}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Grading Form */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">Grade Submission</h3>
                    {isQuizAssignment && (
                      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Quiz assignment detected. Save Grade will auto-grade from answer key.
                      </div>
                    )}
                    <div>
                      <Label htmlFor="score" className="text-slate-300">Score (0-100)</Label>
                      <Input
                        id="score"
                        type="number"
                        min="0"
                        max="100"
                        value={gradeScore}
                        onChange={(e) => setGradeScore(e.target.value)}
                        disabled={saving}
                        className="text-lg font-semibold bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-blue-400/20"
                      />
                    </div>

                    <div>
                      <Label htmlFor="feedback" className="text-slate-300">Feedback</Label>
                      <textarea
                        id="feedback"
                        value={gradeFeedback}
                        onChange={(e) => setGradeFeedback(e.target.value)}
                        disabled={saving}
                        placeholder="Provide constructive feedback..."
                        className="w-full px-3 py-2 border rounded-md bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-blue-400/50 focus:ring-blue-400/20"
                        rows={6}
                      />
                    </div>

                    <Button
                      onClick={handleGradeSubmission}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 border-0"
                      disabled={saving || (!isQuizAssignment && gradeScore === '')}
                    >
                      {saving ? 'Saving...' : 'Save Grade'}
                    </Button>

                    {selectedSubmission.status === 'graded' && (
                      <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg backdrop-blur-sm">
                        <p className="text-sm text-emerald-300">
                          Already graded: <span className="font-semibold">{selectedSubmission.score}%</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-dashed border-white/20 shadow-2xl p-12">
                <p className="text-slate-300 text-center">Select a submission to grade</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
