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
        const { data: submissionData, error: submissionError } = await supabase
          .from('submissions')
          .select('*')
          .eq('student_id', authUser.id)

        if (submissionError) throw submissionError
        setSubmissions(submissionData || [])
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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const getSubmissionStatus = (assignmentId: string) => {
    return submissions.find((s) => s.assignment_id === assignmentId)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-secondary">{classroom?.name}</h1>
            <p className="text-sm text-muted-foreground">{classroom?.description}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-secondary mb-4">Assignments</h2>

        {assignments.length === 0 ? (
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No assignments yet. Check back later!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const submission = getSubmissionStatus(assignment.id)
              return (
                <Card
                  key={assignment.id}
                  className="hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/assignment/${assignment.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-secondary">{assignment.title}</CardTitle>
                          {submission?.status === 'graded' && (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          )}
                          {submission?.status === 'submitted' && (
                            <Clock className="w-5 h-5 text-yellow-500" />
                          )}
                        </div>
                        <CardDescription>{assignment.description}</CardDescription>
                      </div>
                      <div className="text-right">
                        {assignment.due_date && (
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        )}
                        {submission?.score !== undefined && (
                          <p className="text-lg font-semibold text-primary">{submission.score}%</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
