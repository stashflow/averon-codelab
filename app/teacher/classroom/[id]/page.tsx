'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Plus, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

type UnitRow = {
  id: string
  unit_number: number | null
  order_index: number | null
  title: string
  lessons: Array<{
    id: string
    lesson_number: number | null
    order_index: number | null
    title: string
  }>
}

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
  const [userId, setUserId] = useState<string>('')

  const [courses, setCourses] = useState<any[]>([])
  const [offeringsByCourseId, setOfferingsByCourseId] = useState<Record<string, { id: string; is_active: boolean }>>({})
  const [savingAccess, setSavingAccess] = useState(false)

  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [courseUnits, setCourseUnits] = useState<UnitRow[]>([])
  const [selectedLessonIds, setSelectedLessonIds] = useState<Record<string, boolean>>({})
  const [portionDueDate, setPortionDueDate] = useState('')
  const [portionInstructions, setPortionInstructions] = useState('')
  const [assigningPortion, setAssigningPortion] = useState(false)

  const activeOfferingCourses = useMemo(
    () => courses.filter((course) => offeringsByCourseId[course.id]?.is_active),
    [courses, offeringsByCourseId],
  )

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId])

  useEffect(() => {
    if (!selectedCourseId) {
      setCourseUnits([])
      setSelectedLessonIds({})
      return
    }

    async function loadCourseUnits() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('units')
        .select('id, unit_number, order_index, title, lessons(id, lesson_number, order_index, title)')
        .eq('course_id', selectedCourseId)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('[v0] error loading unit portions', error)
        setCourseUnits([])
        return
      }

      const normalized = ((data || []) as UnitRow[]).map((unit) => ({
        ...unit,
        lessons: (unit.lessons || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
      }))

      setCourseUnits(normalized)
      setSelectedLessonIds({})
    }

    loadCourseUnits()
  }, [selectedCourseId])

  useEffect(() => {
    if (!selectedCourseId && activeOfferingCourses.length > 0) {
      setSelectedCourseId(activeOfferingCourses[0].id)
    }
  }, [selectedCourseId, activeOfferingCourses])

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
      setUserId(authUser.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single()

      if (profile?.role !== 'teacher') {
        router.push('/protected')
        return
      }

      const { data: classData } = await supabase
        .from('classrooms')
        .select('id, name, code, allow_non_related_courses')
        .eq('id', classroomId)
        .eq('teacher_id', authUser.id)
        .single()

      if (!classData) {
        router.push('/protected/teacher')
        return
      }

      setClassroom(classData)

      const [{ data: enrollmentData }, { data: assignmentData }, { data: courseData }, { data: offeringsData }] = await Promise.all([
        supabase.from('enrollments').select('id, student_id, classroom_id, enrolled_at').eq('classroom_id', classroomId),
        supabase.from('assignments').select('*').eq('classroom_id', classroomId).order('created_at', { ascending: false }),
        supabase.from('courses').select('id, name, description, difficulty_level').eq('is_active', true).order('name', { ascending: true }),
        supabase.from('classroom_course_offerings').select('id, course_id, is_active').eq('classroom_id', classroomId),
      ])

      const studentIds = (enrollmentData || []).map((row: any) => row.student_id).filter(Boolean)
      let profileById: Record<string, { email: string | null; full_name: string | null }> = {}
      if (studentIds.length > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', studentIds)
        profileById = Object.fromEntries((profileRows || []).map((row: any) => [row.id, { email: row.email || null, full_name: row.full_name || null }]))
      }

      setStudents(
        (enrollmentData || []).map((row: any) => ({
          ...row,
          profiles: profileById[row.student_id] || null,
        })),
      )
      setAssignments(assignmentData || [])
      setCourses(courseData || [])

      const mapped: Record<string, { id: string; is_active: boolean }> = {}
      ;(offeringsData || []).forEach((offering: any) => {
        mapped[offering.course_id] = { id: offering.id, is_active: offering.is_active }
      })
      setOfferingsByCourseId(mapped)
    } catch (err: any) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAssignment() {
    if (!classroom || !userId) return
    setCreatingAssignment(true)

    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          classroom_id: classroom.id,
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

  async function setAllowNonRelatedCourses(value: boolean) {
    if (!classroom) return
    setSavingAccess(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('classrooms')
      .update({ allow_non_related_courses: value })
      .eq('id', classroom.id)

    if (error) {
      alert(error.message)
      setSavingAccess(false)
      return
    }

    setClassroom((prev: any) => ({ ...prev, allow_non_related_courses: value }))
    setSavingAccess(false)
  }

  async function toggleCourseOffering(courseId: string, active: boolean) {
    if (!classroom || !userId) return
    setSavingAccess(true)
    const supabase = createClient()

    let error: any = null
    if (active) {
      const result = await supabase.from('classroom_course_offerings').upsert(
        {
          classroom_id: classroom.id,
          course_id: courseId,
          offered_by: userId,
          is_active: true,
        },
        { onConflict: 'classroom_id,course_id' },
      )
      error = result.error
    } else {
      const result = await supabase
        .from('classroom_course_offerings')
        .update({ is_active: false, offered_by: userId })
        .eq('classroom_id', classroom.id)
        .eq('course_id', courseId)
      error = result.error
    }

    if (error) {
      alert(error.message)
      setSavingAccess(false)
      return
    }

    setOfferingsByCourseId((prev) => ({
      ...prev,
      [courseId]: { id: prev[courseId]?.id || `${classroom.id}-${courseId}`, is_active: active },
    }))

    if (!active && selectedCourseId === courseId) {
      const nextCourse = activeOfferingCourses.find((course) => course.id !== courseId)
      setSelectedCourseId(nextCourse?.id || '')
    }

    if (active && !selectedCourseId) {
      setSelectedCourseId(courseId)
    }

    setSavingAccess(false)
  }

  async function assignCoursePortion() {
    const lessonIds = Object.keys(selectedLessonIds).filter((id) => selectedLessonIds[id])
    if (!classroom || !userId || lessonIds.length === 0) return

    setAssigningPortion(true)
    const supabase = createClient()

    const payload = lessonIds.map((lessonId) => ({
      classroom_id: classroom.id,
      lesson_id: lessonId,
      assigned_by: userId,
      due_date: portionDueDate ? new Date(portionDueDate).toISOString() : null,
      instructions: portionInstructions.trim() || null,
      is_required: true,
      points_possible: 100,
    }))

    const { error } = await supabase
      .from('lesson_assignments')
      .upsert(payload, { onConflict: 'classroom_id,lesson_id' })

    if (error) {
      alert(error.message)
      setAssigningPortion(false)
      return
    }

    setSelectedLessonIds({})
    setPortionInstructions('')
    setPortionDueDate('')
    setAssigningPortion(false)
    alert(`Assigned ${lessonIds.length} lesson${lessonIds.length === 1 ? '' : 's'} to this class.`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950">
        <p className="text-slate-300">Loading...</p>
      </div>
    )
  }

  const selectedLessonCount = Object.values(selectedLessonIds).filter(Boolean).length

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
        <Card>
          <CardHeader>
            <CardTitle>Course Access Controls</CardTitle>
            <CardDescription>Offer courses for this class and choose whether students may take unrelated courses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block">Allow Non-Related Courses</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={classroom?.allow_non_related_courses ? 'default' : 'outline'}
                  disabled={savingAccess}
                  onClick={() => setAllowNonRelatedCourses(true)}
                >
                  True
                </Button>
                <Button
                  type="button"
                  variant={!classroom?.allow_non_related_courses ? 'default' : 'outline'}
                  disabled={savingAccess}
                  onClick={() => setAllowNonRelatedCourses(false)}
                >
                  False
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {courses.map((course) => {
                const offered = offeringsByCourseId[course.id]?.is_active || false
                return (
                  <div key={course.id} className="border rounded-lg p-3 bg-card">
                    <p className="font-medium text-sm">{course.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">{course.difficulty_level || 'course'}</p>
                    <Button
                      size="sm"
                      variant={offered ? 'default' : 'outline'}
                      disabled={savingAccess}
                      onClick={() => toggleCourseOffering(course.id, !offered)}
                    >
                      {offered ? 'Offered' : 'Not Offered'}
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign Course Portions</CardTitle>
            <CardDescription>Assign specific lessons from offered courses to this classroom.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="portion-course">Offered Course</Label>
                <select
                  id="portion-course"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="">Select offered course</option>
                  {activeOfferingCourses.map((course) => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="portion-due-date">Due Date (optional)</Label>
                <Input id="portion-due-date" type="date" value={portionDueDate} onChange={(e) => setPortionDueDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="portion-notes">Instructions (optional)</Label>
                <Input
                  id="portion-notes"
                  value={portionInstructions}
                  onChange={(e) => setPortionInstructions(e.target.value)}
                  placeholder="Instructions for students"
                />
              </div>
            </div>

            {selectedCourseId && courseUnits.length === 0 && (
              <p className="text-sm text-muted-foreground">No lessons found in this course yet.</p>
            )}

            <div className="space-y-4 max-h-[380px] overflow-auto pr-2">
              {courseUnits.map((unit) => (
                <div key={unit.id} className="border rounded-lg p-3">
                  <p className="font-medium mb-2">Unit {unit.unit_number || unit.order_index || '-'}: {unit.title}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {unit.lessons.map((lesson) => (
                      <label key={lesson.id} className="text-sm flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!selectedLessonIds[lesson.id]}
                          onChange={(e) => setSelectedLessonIds((prev) => ({ ...prev, [lesson.id]: e.target.checked }))}
                        />
                        <span>Lesson {lesson.lesson_number || lesson.order_index || '-'}: {lesson.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={assignCoursePortion}
              disabled={assigningPortion || selectedLessonCount === 0 || !selectedCourseId}
            >
              {assigningPortion ? 'Assigning...' : `Assign ${selectedLessonCount} Lesson${selectedLessonCount === 1 ? '' : 's'}`}
            </Button>
          </CardContent>
        </Card>

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
