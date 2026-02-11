'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Send, Play, CheckCircle2, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AssignmentPage() {
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string

  const [assignment, setAssignment] = useState<any>(null)
  const [code, setCode] = useState('')
  const [submission, setSubmission] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [testingCode, setTestingCode] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

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

        setUser(authUser)

        // Load assignment
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('assignments')
          .select('*')
          .eq('id', assignmentId)
          .single()

        if (assignmentError) throw assignmentError
        setAssignment(assignmentData)
        setCode(assignmentData.starter_code || '')

        // Load existing submission
        const { data: submissionData, error: submissionError } = await supabase
          .from('submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('student_id', authUser.id)
          .single()

        if (submissionError && submissionError.code !== 'PGRST116') {
          throw submissionError
        }

        if (submissionData) {
          setSubmission(submissionData)
          setCode(submissionData.code)
        }
      } catch (err: any) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [assignmentId])

  async function handleRunTests() {
    if (!code.trim()) return

    setTestingCode(true)

    // Simulate test execution with mock results
    setTimeout(() => {
      const mockTests = [
        { name: 'Test 1: Basic Input', passed: true, expected: '5', actual: '5' },
        { name: 'Test 2: Edge Case', passed: true, expected: '0', actual: '0' },
        { name: 'Test 3: Large Numbers', passed: code.length > 50, expected: '1000', actual: code.length > 50 ? '1000' : '500' },
      ]

      const passedCount = mockTests.filter((t) => t.passed).length
      const score = Math.round((passedCount / mockTests.length) * 100)

      setTestResults({
        tests: mockTests,
        passed: passedCount,
        total: mockTests.length,
        score,
      })

      setTestingCode(false)
    }, 1500)
  }

  async function handleSubmit() {
    if (!code.trim()) return

    setSubmitting(true)

    const supabase = createClient()

    try {
      if (submission) {
        // Update existing submission
        const { error } = await supabase
          .from('submissions')
          .update({
            code,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .eq('id', submission.id)

        if (error) throw error
      } else {
        // Create new submission
        const { data, error } = await supabase
          .from('submissions')
          .insert({
            assignment_id: assignmentId,
            student_id: user.id,
            code,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .select()

        if (error) throw error
        setSubmission(data[0])
      }

      alert('Submission successful! Your teacher will review it soon.')
    } catch (err: any) {
      alert('Error submitting: ' + (err.message || 'Unknown error'))
    } finally {
      setSubmitting(false)
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-200 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{assignment?.title}</h1>
              <p className="text-sm text-slate-400">
                {assignment?.language?.charAt(0).toUpperCase() + assignment?.language?.slice(1)}
                {assignment?.due_date && ` • Due: ${new Date(assignment.due_date).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          {submission?.status === 'graded' && (
            <div className="text-right">
              <p className="text-sm text-slate-400">Score</p>
              <p className="text-2xl font-bold text-blue-400">{submission.score}%</p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Assignment Details */}
          <div className="lg:col-span-1">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 sticky top-24">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Assignment Details</h3>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Description</p>
                  <p className="text-sm text-slate-200">{assignment?.description || 'No description provided'}</p>
                </div>

                {submission?.feedback && (
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Teacher Feedback</p>
                    <p className="text-sm p-3 bg-white/5 rounded-lg border border-white/10 text-slate-200">{submission.feedback}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-slate-400 mb-1">Status</p>
                  <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {submission?.status === 'graded' ? 'Graded' : submission?.status === 'submitted' ? 'Submitted' : 'Not Started'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Code Editor */}
          <div className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="// Write your code here..."
                  className="w-full h-96 p-4 bg-slate-950/50 border border-white/20 rounded-lg font-mono text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                />

                <div className="flex gap-2">
                  <Button
                    onClick={handleRunTests}
                    variant="outline"
                    className="gap-2 bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white backdrop-blur-sm"
                    disabled={testingCode || !code.trim()}
                  >
                    <Play className="w-4 h-4" />
                    {testingCode ? 'Running Tests...' : 'Run Tests'}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 border-0 gap-2"
                    disabled={submitting || !code.trim()}
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Submitting...' : 'Submit Solution'}
                  </Button>
                </div>

                {testResults && (
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-white">Test Results</h4>
                        <div className="text-right">
                          <p className="text-sm text-slate-400">Score</p>
                          <p className="text-2xl font-bold text-blue-400">{testResults.score}%</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">
                        {testResults.passed} of {testResults.total} tests passed
                      </p>
                      <div className="space-y-2">
                        {testResults.tests.map((test: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                            <div className="mt-0.5">
                              {test.passed ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">{test.name}</p>
                              {!test.passed && (
                                <p className="text-xs text-slate-400 mt-1">
                                  Expected: <span className="font-mono text-slate-300">{test.expected}</span>, Got:{' '}
                                  <span className="font-mono text-slate-300">{test.actual}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {submission?.status === 'graded' && (
                  <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-lg backdrop-blur-sm">
                    <p className="text-emerald-300 font-medium">Submission Graded</p>
                    <p className="text-sm text-emerald-200 mt-1">Your score: {submission.score}%</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
