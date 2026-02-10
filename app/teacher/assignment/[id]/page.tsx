'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

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
        // Load assignment
        const { data: assignmentData } = await supabase
          .from('assignments')
          .select('*')
          .eq('id', assignmentId)
          .single()

        setAssignment(assignmentData)

        // Load all submissions for this assignment
        const { data: submissionData } = await supabase
          .from('submissions')
          .select('*, profiles(email, full_name)')
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false })

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
  }, [assignmentId])

  async function handleGradeSubmission() {
    if (!selectedSubmission || !gradeScore) return

    setSaving(true)

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          score: parseInt(gradeScore) || 0,
          feedback: gradeFeedback,
          status: 'graded',
          graded_at: new Date().toISOString(),
        })
        .eq('id', selectedSubmission.id)

      if (error) throw error

      // Update local state
      setSelectedSubmission({
        ...selectedSubmission,
        score: parseInt(gradeScore),
        feedback: gradeFeedback,
        status: 'graded',
      })

      // Update submissions list
      setSubmissions(
        submissions.map((s) =>
          s.id === selectedSubmission.id
            ? {
                ...s,
                score: parseInt(gradeScore),
                feedback: gradeFeedback,
                status: 'graded',
              }
            : s
        )
      )

      alert('Grade saved successfully!')
    } catch (err: any) {
      alert('Error saving grade: ' + err.message)
    } finally {
      setSaving(false)
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-secondary">Grade Submissions</h1>
            <p className="text-sm text-muted-foreground">{assignment?.title}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Submissions List */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h2 className="text-lg font-semibold text-secondary mb-3">Submissions</h2>
              <div className="space-y-2">
                {submissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No submissions yet</p>
                ) : (
                  submissions.map((submission) => (
                    <Card
                      key={submission.id}
                      className={`cursor-pointer transition-colors ${selectedSubmission?.id === submission.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}
                      onClick={() => {
                        setSelectedSubmission(submission)
                        setGradeScore(submission.score?.toString() || '')
                        setGradeFeedback(submission.feedback || '')
                      }}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-secondary truncate">{submission.profiles?.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{submission.profiles?.email}</p>
                          </div>
                          {submission.status === 'graded' && (
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          )}
                          {submission.status === 'submitted' && <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                        </div>
                      </CardContent>
                    </Card>
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
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-primary">Student Code</CardTitle>
                    <CardDescription>
                      Submitted: {new Date(selectedSubmission.submitted_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-secondary/5 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono">
                      {selectedSubmission.code}
                    </pre>
                  </CardContent>
                </Card>

                {/* Grading Form */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-primary">Grade Submission</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="score">Score (0-100)</Label>
                      <Input
                        id="score"
                        type="number"
                        min="0"
                        max="100"
                        value={gradeScore}
                        onChange={(e) => setGradeScore(e.target.value)}
                        disabled={saving}
                        className="text-lg font-semibold"
                      />
                    </div>

                    <div>
                      <Label htmlFor="feedback">Feedback</Label>
                      <textarea
                        id="feedback"
                        value={gradeFeedback}
                        onChange={(e) => setGradeFeedback(e.target.value)}
                        disabled={saving}
                        placeholder="Provide constructive feedback..."
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={6}
                      />
                    </div>

                    <Button
                      onClick={handleGradeSubmission}
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={saving || gradeScore === ''}
                    >
                      {saving ? 'Saving...' : 'Save Grade'}
                    </Button>

                    {selectedSubmission.status === 'graded' && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-900">
                          Already graded: <span className="font-semibold">{selectedSubmission.score}%</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-dashed border-2 border-muted">
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Select a submission to grade</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
