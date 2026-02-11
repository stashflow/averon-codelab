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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Submissions List */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h2 className="text-lg font-semibold text-white mb-3">Submissions</h2>
              <div className="space-y-2">
                {submissions.length === 0 ? (
                  <p className="text-sm text-slate-400">No submissions yet</p>
                ) : (
                  submissions.map((submission) => (
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
                      </div>
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
                        Submitted: {new Date(selectedSubmission.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <pre className="bg-slate-950/50 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono text-slate-200 border border-white/10">
                      {selectedSubmission.code}
                    </pre>
                  </div>
                </div>

                {/* Grading Form */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">Grade Submission</h3>
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
                      disabled={saving || gradeScore === ''}
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
