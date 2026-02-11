'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ClassroomPage() {
  const router = useRouter()
  const params = useParams()
  const classroomId = params.id as string

  const [classroom, setClassroom] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single()

        if (profile?.role !== 'student') {
          router.push('/protected')
          return
        }

        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('classroom_id', classroomId)
          .eq('student_id', authUser.id)
          .maybeSingle()

        if (!enrollment) {
          router.push('/student/dashboard')
          return
        }

        // Load classroom
        const { data: classData, error: classError } = await supabase
          .from('classrooms')
          .select('*')
          .eq('id', classroomId)
          .single()

        if (classError) throw classError
        setClassroom(classData)

        // Load assignments
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('assignments')
          .select('*')
          .eq('classroom_id', classroomId)
          .order('created_at', { ascending: false })

        if (assignmentError) throw assignmentError
        setAssignments(assignmentData || [])

        // Load submissions
        const assignmentIds = (assignmentData || []).map((a: any) => a.id)
        if (assignmentIds.length === 0) {
          setSubmissions([])
        } else {
          const { data: submissionData, error: submissionError } = await supabase
            .from('submissions')
            .select('*')
            .eq('student_id', authUser.id)
            .in('assignment_id', assignmentIds)

          if (submissionError) throw submissionError
          setSubmissions(submissionData || [])
        }
      } catch (err: any) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [classroomId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950">
        <p className="text-slate-300">Loading...</p>
      </div>
    )
  }

  const getSubmissionStatus = (assignmentId: string) => {
    return submissions.find((s) => s.assignment_id === assignmentId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950">
      <header className="border-b border-white/5 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-200 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{classroom?.name}</h1>
            <p className="text-sm text-slate-400">{classroom?.description}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-white mb-4">Assignments</h2>

        {assignments.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-dashed border-white/20 shadow-2xl p-12">
            <p className="text-slate-300 text-center">No assignments yet. Check back later!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const submission = getSubmissionStatus(assignment.id)
              return (
                <div
                  key={assignment.id}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 hover:border-blue-400/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/assignment/${assignment.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{assignment.title}</h3>
                        {submission?.status === 'graded' && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        )}
                        {submission?.status === 'submitted' && (
                          <Clock className="w-5 h-5 text-yellow-400" />
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{assignment.description}</p>
                    </div>
                    <div className="text-right">
                      {assignment.due_date && (
                        <p className="text-sm text-slate-400">
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </p>
                      )}
                      {submission?.score !== undefined && (
                        <p className="text-lg font-semibold text-blue-400">{submission.score}%</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
