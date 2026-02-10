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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-secondary">{assignment?.title}</h1>
              <p className="text-sm text-muted-foreground">
                {assignment?.language?.charAt(0).toUpperCase() + assignment?.language?.slice(1)}
                {assignment?.due_date && ` • Due: ${new Date(assignment.due_date).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          {submission?.status === 'graded' && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-2xl font-bold text-primary">{submission.score}%</p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Assignment Details */}
          <div className="lg:col-span-1">
            <Card className="border-primary/20 sticky top-24">
              <CardHeader>
                <CardTitle className="text-primary">Assignment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{assignment?.description || 'No description provided'}</p>
                </div>

                {submission?.feedback && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Teacher Feedback</p>
                    <p className="text-sm p-2 bg-secondary/5 rounded border border-secondary/20">{submission.feedback}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                    {submission?.status === 'graded' ? 'Graded' : submission?.status === 'submitted' ? 'Submitted' : 'Not Started'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Code Editor */}
          <div className="lg:col-span-2">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Code Editor</CardTitle>
                <CardDescription>Write your solution below</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="// Write your code here..."
                  className="w-full h-96 p-4 bg-secondary/5 border border-primary/20 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />

                <div className="flex gap-2">
                  <Button
                    onClick={handleRunTests}
                    variant="outline"
                    className="gap-2 bg-transparent"
                    disabled={testingCode || !code.trim()}
                  >
                    <Play className="w-4 h-4" />
                    {testingCode ? 'Running Tests...' : 'Run Tests'}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="bg-primary hover:bg-primary/90 gap-2"
                    disabled={submitting || !code.trim()}
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Submitting...' : 'Submit Solution'}
                  </Button>
                </div>

                {testResults && (
                  <Card className="bg-background border-primary/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-primary">Test Results</CardTitle>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Score</p>
                          <p className="text-2xl font-bold text-primary">{testResults.score}%</p>
                        </div>
                      </div>
                      <CardDescription>
                        {testResults.passed} of {testResults.total} tests passed
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {testResults.tests.map((test: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-secondary/5 rounded border border-secondary/10">
                          <div className="mt-0.5">
                            {test.passed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-destructive" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{test.name}</p>
                            {!test.passed && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Expected: <span className="font-mono">{test.expected}</span>, Got:{' '}
                                <span className="font-mono">{test.actual}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {submission?.status === 'graded' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-900 font-medium">Submission Graded</p>
                    <p className="text-sm text-green-800 mt-1">Your score: {submission.score}%</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
