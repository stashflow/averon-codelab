'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Plus, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function TeacherClassroomPage() {
  const router = useRouter()
  const params = useParams()
  const classroomId = params.id as string

  const [classroom, setClassroom] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewAssignment, setShowNewAssignment] = useState(false)
  const [newAssignmentData, setNewAssignmentData] = useState({
    title: '',
    description: '',
    language: 'python',
    starterCode: '',
  })
  const [creatingAssignment, setCreatingAssignment] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      try {
        // Load classroom
        const { data: classData } = await supabase.from('classrooms').select('*').eq('id', classroomId).single()

        setClassroom(classData)

        // Load enrolled students
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('*, profiles(email, full_name)')
          .eq('classroom_id', classroomId)

        setStudents(enrollmentData || [])

        // Load assignments
        const { data: assignmentData } = await supabase
          .from('assignments')
          .select('*')
          .eq('classroom_id', classroomId)
          .order('created_at', { ascending: false })

        setAssignments(assignmentData || [])
      } catch (err: any) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [classroomId])

  async function handleCreateAssignment() {
    setCreatingAssignment(true)

    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          classroom_id: classroomId,
          title: newAssignmentData.title,
          description: newAssignmentData.description,
          starter_code: newAssignmentData.starterCode,
          language: newAssignmentData.language,
          test_cases: [],
        })
        .select()

      if (error) throw error

      setAssignments([data[0], ...assignments])
      setNewAssignmentData({
        title: '',
        description: '',
        language: 'python',
        starterCode: '',
      })
      setShowNewAssignment(false)
    } catch (err: any) {
      alert('Error creating assignment: ' + err.message)
    } finally {
      setCreatingAssignment(false)
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
            <h1 className="text-2xl font-bold text-white">{classroom?.name}</h1>
            <p className="text-sm text-slate-400">Class Code: {classroom?.code}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Students Section */}
        <div>
          <h2 className="text-xl font-semibold text-secondary mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Enrolled Students ({students.length})
          </h2>

          {students.length === 0 ? (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No students enrolled yet. Share the code: <span className="font-mono font-bold text-primary">{classroom?.code}</span></p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map((student) => (
                <Card key={student.id} className="border-primary/10">
                  <CardContent className="pt-6">
                    <p className="font-medium text-secondary">{student.profiles?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{student.profiles?.email}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Assignments Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-secondary">Assignments</h2>
            <Button
              onClick={() => setShowNewAssignment(!showNewAssignment)}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              <Plus className="w-4 h-4" />
              New Assignment
            </Button>
          </div>

          {showNewAssignment && (
            <Card className="border-primary/20 mb-6">
              <CardHeader>
                <CardTitle className="text-primary">Create Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Fibonacci Sequence"
                    value={newAssignmentData.title}
                    onChange={(e) => setNewAssignmentData({ ...newAssignmentData, title: e.target.value })}
                    disabled={creatingAssignment}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    placeholder="Assignment description and requirements..."
                    value={newAssignmentData.description}
                    onChange={(e) => setNewAssignmentData({ ...newAssignmentData, description: e.target.value })}
                    disabled={creatingAssignment}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="language">Programming Language</Label>
                  <select
                    id="language"
                    value={newAssignmentData.language}
                    onChange={(e) => setNewAssignmentData({ ...newAssignmentData, language: e.target.value })}
                    disabled={creatingAssignment}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="starter">Starter Code (optional)</Label>
                  <textarea
                    id="starter"
                    placeholder="# def solve():..."
                    value={newAssignmentData.starterCode}
                    onChange={(e) => setNewAssignmentData({ ...newAssignmentData, starterCode: e.target.value })}
                    disabled={creatingAssignment}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    rows={6}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateAssignment}
                    className="bg-primary hover:bg-primary/90"
                    disabled={creatingAssignment || !newAssignmentData.title.trim()}
                  >
                    {creatingAssignment ? 'Creating...' : 'Create Assignment'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {assignments.length === 0 ? (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No assignments yet. Create one to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <Card key={assignment.id} className="border-secondary/10 hover:border-secondary/30 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-secondary">{assignment.title}</CardTitle>
                        <CardDescription>{assignment.description}</CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {assignment.language?.charAt(0).toUpperCase() + assignment.language?.slice(1)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/teacher/assignment/${assignment.id}`)}
                    >
                      View Submissions
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
