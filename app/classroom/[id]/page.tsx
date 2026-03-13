'use client'

import { useState, useEffect, useEffectEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SiteBackdrop } from '@/components/site-backdrop'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, Clock, Code2, ArrowRight } from 'lucide-react'
import { getAssignmentAvailability } from '@/lib/assignment-workflow'

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

  const loadData = useEffectEvent(async () => {
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

      const { data: classData, error: classError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', classroomId)
        .single()

      if (classError) throw classError
      setClassroom(classData)

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false })

      if (assignmentError) throw assignmentError
      setAssignments(assignmentData || [])

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
  })

  useEffect(() => {
    void loadData()
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
    <div className="min-h-screen warm-aurora text-foreground">
      <SiteBackdrop />

      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/78 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <p className="site-kicker mb-2">
                <span className="w-4 h-px bg-primary" />
                Classroom
              </p>
              <h1 className="text-2xl font-bold text-foreground truncate">{classroom?.name}</h1>
              <p className="text-sm text-muted-foreground">{classroom?.description || 'Live assignments, grading, and private sandbox practice.'}</p>
            </div>
          </div>
          <Link href={`/classroom/${classroomId}/sandbox`}>
            <Button className="gap-2">
              <Code2 className="w-4 h-4" />
              Open Sandbox
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-4">
            <h2 className="site-title text-3xl sm:text-4xl">Assignments and practice, all in one place.</h2>
            <p className="site-subtitle max-w-2xl">
              Keep up with active work, review submission status, and jump into your class sandbox whenever you need a clean place to test ideas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge className="border-primary/30 bg-primary/10 text-primary">Student Workspace</Badge>
              <Badge variant="outline" className="border-border/70 bg-background/70">
                {assignments.length} assignment{assignments.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </div>

          <Card className="site-panel">
            <CardHeader>
              <CardTitle>Sandbox Mode</CardTitle>
              <CardDescription>
                Every enrolled student has a private coding workspace in this class. Saved code and last-run output stay attached to this classroom.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/classroom/${classroomId}/sandbox`}>
                <Button className="gap-2">
                  Launch Sandbox
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Assignments</h2>

          {assignments.length === 0 ? (
            <div className="site-panel p-12">
              <p className="text-center text-muted-foreground">No assignments yet. Check back later.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => {
                const submission = getSubmissionStatus(assignment.id)
                const availability = getAssignmentAvailability(assignment)
                return (
                  <div
                    key={assignment.id}
                    className="site-panel cursor-pointer p-6 transition-all hover:border-primary/40"
                    onClick={() => router.push(`/assignment/${assignment.id}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{assignment.title}</h3>
                          {submission?.status === 'graded' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                          {submission?.status === 'submitted' && <Clock className="w-5 h-5 text-amber-500" />}
                          <Badge variant="outline" className="border-border/70 bg-background/70">{availability.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 leading-6">{assignment.description}</p>
                      </div>
                      <div className="text-right">
                        {assignment.due_date && (
                          <p className="text-sm text-muted-foreground">
                            Due {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        )}
                        {submission?.score !== undefined && submission?.score !== null && (
                          <p className="text-2xl font-semibold text-primary mt-2">{submission.score}%</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
