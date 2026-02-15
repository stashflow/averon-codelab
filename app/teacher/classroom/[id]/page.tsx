'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Plus, Users, ClipboardCheck, BarChart3 } from 'lucide-react'

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

type StudentPerformance = {
  lessonsCompleted: number
  lessonsInProgress: number
  assignmentsSubmitted: number
  assignmentsGraded: number
  averageScore: number
}

type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
  points: number
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
    assignmentType: 'coding' as 'coding' | 'quiz',
    quizQuestions: [
      {
        id: crypto.randomUUID(),
        prompt: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: '',
        points: 1,
      } satisfies QuizQuestion,
    ] as QuizQuestion[],
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
  const [portionAssignments, setPortionAssignments] = useState<any[]>([])
  const [removingPortionId, setRemovingPortionId] = useState<string | null>(null)
  const [bulkPortionAction, setBulkPortionAction] = useState<string | null>(null)
  const [studentPerformanceById, setStudentPerformanceById] = useState<Record<string, StudentPerformance>>({})
  const [notionSubmissions, setNotionSubmissions] = useState<any[]>([])

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
        .select('id, name, code, allow_non_related_courses, grade_notions')
        .eq('id', classroomId)
        .eq('teacher_id', authUser.id)
        .single()

      if (!classData) {
        router.push('/protected/teacher')
        return
      }

      setClassroom(classData)

      const [{ data: enrollmentData }, { data: assignmentData }, { data: courseData }, { data: offeringsData }, { data: portionAssignmentsData }] = await Promise.all([
        supabase.from('enrollments').select('id, student_id, classroom_id, enrolled_at').eq('classroom_id', classroomId),
        supabase.from('assignments').select('*').eq('classroom_id', classroomId).order('created_at', { ascending: false }),
        supabase.from('courses').select('id, name, description, difficulty_level').eq('is_active', true).order('name', { ascending: true }),
        supabase.from('classroom_course_offerings').select('id, course_id, is_active').eq('classroom_id', classroomId),
        supabase
          .from('lesson_assignments')
          .select('id, lesson_id, assigned_at, due_date, instructions, lesson:lesson_id(id, title, lesson_number, unit:unit_id(id, title, unit_number, course:course_id(id, name)))')
          .eq('classroom_id', classroomId)
          .order('assigned_at', { ascending: false }),
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
      setPortionAssignments(portionAssignmentsData || [])

      const assignedLessonIds = Array.from(new Set((portionAssignmentsData || []).map((row: any) => row.lesson_id).filter(Boolean)))
      const assignmentIds = (assignmentData || []).map((row: any) => row.id).filter(Boolean)

      const [progressResponse, submissionResponse] = await Promise.all([
        studentIds.length > 0 && assignedLessonIds.length > 0
          ? supabase
              .from('student_lesson_progress')
              .select('student_id, lesson_id, status')
              .in('student_id', studentIds)
              .in('lesson_id', assignedLessonIds)
          : Promise.resolve({ data: [] as any[] }),
        studentIds.length > 0 && assignmentIds.length > 0
          ? supabase
              .from('submissions')
              .select('student_id, assignment_id, status, score')
              .in('student_id', studentIds)
              .in('assignment_id', assignmentIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const byStudent: Record<string, StudentPerformance> = {}
      studentIds.forEach((studentId) => {
        byStudent[studentId] = {
          lessonsCompleted: 0,
          lessonsInProgress: 0,
          assignmentsSubmitted: 0,
          assignmentsGraded: 0,
          averageScore: 0,
        }
      })

      ;(progressResponse.data || []).forEach((row: any) => {
        if (!byStudent[row.student_id]) return
        if (row.status === 'completed') byStudent[row.student_id].lessonsCompleted += 1
        if (row.status === 'in_progress') byStudent[row.student_id].lessonsInProgress += 1
      })

      const scoreSums: Record<string, { total: number; count: number }> = {}
      ;(submissionResponse.data || []).forEach((row: any) => {
        if (!byStudent[row.student_id]) return
        if (row.status === 'submitted' || row.status === 'graded') byStudent[row.student_id].assignmentsSubmitted += 1
        if (row.status === 'graded') byStudent[row.student_id].assignmentsGraded += 1
        if (typeof row.score === 'number') {
          const current = scoreSums[row.student_id] || { total: 0, count: 0 }
          current.total += row.score
          current.count += 1
          scoreSums[row.student_id] = current
        }
      })

      Object.keys(scoreSums).forEach((studentId) => {
        const total = scoreSums[studentId].total
        const count = scoreSums[studentId].count
        byStudent[studentId].averageScore = count > 0 ? Math.round(total / count) : 0
      })
      setStudentPerformanceById(byStudent)

      if (studentIds.length > 0) {
        const { data: notionRows } = await supabase
          .from('notion_submissions')
          .select('id, student_id, selected_index, is_correct, score, answered_at, question:notion_questions(prompt, options, correct_index, lesson:lesson_id(title))')
          .eq('classroom_id', classroomId)
          .in('student_id', studentIds)
          .order('answered_at', { ascending: false })
          .limit(80)
        setNotionSubmissions(notionRows || [])
      } else {
        setNotionSubmissions([])
      }

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
      const isQuiz = newAssignmentData.assignmentType === 'quiz'
      const normalizedQuizQuestions = (newAssignmentData.quizQuestions || [])
        .map((question) => ({
          id: question.id,
          prompt: question.prompt.trim(),
          options: question.options.map((option) => option.trim()),
          correctIndex: question.correctIndex,
          explanation: question.explanation.trim(),
          points: Math.max(1, Number(question.points) || 1),
          type: 'multiple_choice',
        }))
        .filter((question) => question.prompt && question.options.filter(Boolean).length >= 2)

      if (isQuiz && normalizedQuizQuestions.length === 0) {
        alert('Add at least one valid quiz question with 2+ options.')
        setCreatingAssignment(false)
        return
      }

      const { data, error } = await supabase
        .from('assignments')
        .insert({
          classroom_id: classroom.id,
          title: newAssignmentData.title,
          description: newAssignmentData.description,
          starter_code: isQuiz ? '' : newAssignmentData.starterCode,
          language: isQuiz ? 'quiz' : newAssignmentData.language,
          test_cases: isQuiz ? normalizedQuizQuestions : [],
        })
        .select()

      if (error) throw error

      setAssignments([data[0], ...assignments])
      setNewAssignmentData({
        title: '',
        description: '',
        language: 'python',
        starterCode: '',
        assignmentType: 'coding',
        quizQuestions: [
          {
            id: crypto.randomUUID(),
            prompt: '',
            options: ['', '', '', ''],
            correctIndex: 0,
            explanation: '',
            points: 1,
          },
        ],
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

  async function setGradeNotions(value: boolean) {
    if (!classroom) return
    setSavingAccess(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('classrooms')
      .update({ grade_notions: value })
      .eq('id', classroom.id)

    if (error) {
      alert(error.message)
      setSavingAccess(false)
      return
    }

    setClassroom((prev: any) => ({ ...prev, grade_notions: value }))
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

  const allSelectedCourseLessonIds = useMemo(
    () => courseUnits.flatMap((unit) => unit.lessons.map((lesson) => lesson.id)),
    [courseUnits],
  )
  const assignedLessonIdSet = useMemo(
    () => new Set((portionAssignments || []).map((item: any) => item?.lesson?.id).filter(Boolean)),
    [portionAssignments],
  )
  const selectedCourseAssignedLessonIds = useMemo(
    () => allSelectedCourseLessonIds.filter((lessonId) => assignedLessonIdSet.has(lessonId)),
    [allSelectedCourseLessonIds, assignedLessonIdSet],
  )

  async function assignCoursePortion(lessonIdsOverride?: string[]) {
    const lessonIds = lessonIdsOverride || Object.keys(selectedLessonIds).filter((id) => selectedLessonIds[id])
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
    await loadData()
    setAssigningPortion(false)
    alert(`Assigned ${lessonIds.length} lesson${lessonIds.length === 1 ? '' : 's'} to this class.`)
  }

  async function assignAllCourseLessons() {
    if (!selectedCourseId || allSelectedCourseLessonIds.length === 0) return
    await assignCoursePortion(allSelectedCourseLessonIds)
  }

  async function assignUnitLessons(unit: UnitRow) {
    if (!selectedCourseId) return
    const lessonIds = unit.lessons.map((lesson) => lesson.id)
    if (lessonIds.length === 0) return
    await assignCoursePortion(lessonIds)
  }

  async function removeLessonsFromCoursePortions(lessonIds: string[], successMessage: string) {
    if (!classroom || lessonIds.length === 0) return
    setBulkPortionAction('removing')
    const supabase = createClient()
    const { error } = await supabase
      .from('lesson_assignments')
      .delete()
      .eq('classroom_id', classroom.id)
      .in('lesson_id', lessonIds)

    if (error) {
      alert(error.message)
      setBulkPortionAction(null)
      return
    }

    await loadData()
    setBulkPortionAction(null)
    alert(successMessage)
  }

  async function removeUnitLessons(unit: UnitRow) {
    const lessonIds = unit.lessons.map((lesson) => lesson.id)
    const assignedIds = lessonIds.filter((lessonId) => assignedLessonIdSet.has(lessonId))
    if (assignedIds.length === 0) return
    await removeLessonsFromCoursePortions(
      assignedIds,
      `Removed ${assignedIds.length} lesson assignment${assignedIds.length === 1 ? '' : 's'} from unit "${unit.title}".`,
    )
  }

  async function removeAllSelectedCourseLessons() {
    if (!selectedCourseId || selectedCourseAssignedLessonIds.length === 0) return
    await removeLessonsFromCoursePortions(
      selectedCourseAssignedLessonIds,
      `Removed ${selectedCourseAssignedLessonIds.length} lesson assignment${selectedCourseAssignedLessonIds.length === 1 ? '' : 's'} from this course.`,
    )
  }

  async function removePortionAssignment(assignmentId: string) {
    setRemovingPortionId(assignmentId)
    const supabase = createClient()
    const { error } = await supabase.from('lesson_assignments').delete().eq('id', assignmentId)
    if (error) {
      alert(error.message)
      setRemovingPortionId(null)
      return
    }
    setPortionAssignments((prev) => prev.filter((item) => item.id !== assignmentId))
    setRemovingPortionId(null)
  }

  function addQuizQuestion() {
    setNewAssignmentData((prev) => ({
      ...prev,
      quizQuestions: [
        ...prev.quizQuestions,
        {
          id: crypto.randomUUID(),
          prompt: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          explanation: '',
          points: 1,
        },
      ],
    }))
  }

  function removeQuizQuestion(questionId: string) {
    setNewAssignmentData((prev) => {
      if (prev.quizQuestions.length <= 1) return prev
      return {
        ...prev,
        quizQuestions: prev.quizQuestions.filter((question) => question.id !== questionId),
      }
    })
  }

  function updateQuizQuestion(questionId: string, updater: (question: QuizQuestion) => QuizQuestion) {
    setNewAssignmentData((prev) => ({
      ...prev,
      quizQuestions: prev.quizQuestions.map((question) => (question.id === questionId ? updater(question) : question)),
    }))
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

            <div>
              <Label className="mb-2 block">Teacher Grading for Notions</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={classroom?.grade_notions ? 'default' : 'outline'}
                  disabled={savingAccess}
                  onClick={() => setGradeNotions(true)}
                >
                  Enabled
                </Button>
                <Button
                  type="button"
                  variant={!classroom?.grade_notions ? 'default' : 'outline'}
                  disabled={savingAccess}
                  onClick={() => setGradeNotions(false)}
                >
                  Auto-Grade Only
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {courses.map((course) => {
                const offered = offeringsByCourseId[course.id]?.is_active || false
                return (
                  <div key={course.id} className="border rounded-lg p-3 bg-card">
                    <p className="font-medium text-sm text-slate-100">{course.name}</p>
                    <p className="text-xs text-slate-400 mb-2">{course.difficulty_level || 'course'}</p>
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
              <p className="text-sm text-slate-300">No lessons found in this course yet.</p>
            )}

            <div className="space-y-4 max-h-[380px] overflow-auto pr-2">
              {courseUnits.map((unit) => (
                <div key={unit.id} className="border border-white/10 bg-white/5 rounded-lg p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-100">Unit {unit.unit_number || unit.order_index || '-'}: {unit.title}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => assignUnitLessons(unit)}
                        disabled={assigningPortion || !!bulkPortionAction || unit.lessons.length === 0}
                      >
                        {assigningPortion ? 'Assigning...' : `Assign Unit (${unit.lessons.length})`}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeUnitLessons(unit)}
                        disabled={assigningPortion || !!bulkPortionAction || unit.lessons.every((lesson) => !assignedLessonIdSet.has(lesson.id))}
                      >
                        {bulkPortionAction ? 'Removing...' : 'Remove Unit'}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {unit.lessons.map((lesson) => (
                      <label key={lesson.id} className="text-sm flex items-center gap-2 text-slate-200">
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

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => assignCoursePortion()}
                disabled={assigningPortion || !!bulkPortionAction || selectedLessonCount === 0 || !selectedCourseId}
              >
                {assigningPortion ? 'Assigning...' : `Assign ${selectedLessonCount} Lesson${selectedLessonCount === 1 ? '' : 's'}`}
              </Button>
              <Button
                variant="outline"
                onClick={assignAllCourseLessons}
                disabled={assigningPortion || !!bulkPortionAction || !selectedCourseId || allSelectedCourseLessonIds.length === 0}
              >
                {assigningPortion ? 'Assigning...' : `Assign All (${allSelectedCourseLessonIds.length})`}
              </Button>
              <Button
                variant="destructive"
                onClick={removeAllSelectedCourseLessons}
                disabled={assigningPortion || !!bulkPortionAction || !selectedCourseId || selectedCourseAssignedLessonIds.length === 0}
              >
                {bulkPortionAction ? 'Removing...' : `Remove All (${selectedCourseAssignedLessonIds.length})`}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Course Portions</CardTitle>
            <CardDescription>Manage and remove lesson portions already assigned to this class.</CardDescription>
          </CardHeader>
          <CardContent>
            {portionAssignments.length === 0 ? (
              <p className="text-sm text-slate-300">No lesson portions assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {portionAssignments.map((item) => (
                  <div key={item.id} className="border border-white/10 bg-white/5 rounded-lg p-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {item.lesson?.unit?.course?.name || 'Course'} - Unit {item.lesson?.unit?.unit_number || '-'} Lesson {item.lesson?.lesson_number || '-'}
                      </p>
                      <p className="text-sm text-slate-300">{item.lesson?.title || 'Lesson'}</p>
                      {item.due_date && (
                        <p className="text-xs text-slate-400">Due: {new Date(item.due_date).toLocaleDateString()}</p>
                      )}
                      {item.instructions && (
                        <p className="text-xs text-slate-400 mt-1">Notes: {item.instructions}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removePortionAssignment(item.id)}
                      disabled={removingPortionId === item.id}
                    >
                      {removingPortionId === item.id ? 'Removing...' : 'Remove'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Enrolled Students ({students.length})
          </h2>

          {students.length > 0 && (
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Card className="border-white/10 bg-white/5">
                <CardContent className="pt-5">
                  <p className="text-xs text-slate-400">Lessons Completed</p>
                  <p className="text-2xl font-semibold text-white">
                    {students.reduce((total, student) => total + (studentPerformanceById[student.student_id]?.lessonsCompleted || 0), 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="pt-5">
                  <p className="text-xs text-slate-400">Assignments Submitted</p>
                  <p className="text-2xl font-semibold text-white">
                    {students.reduce((total, student) => total + (studentPerformanceById[student.student_id]?.assignmentsSubmitted || 0), 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="pt-5">
                  <p className="text-xs text-slate-400">Class Avg Grade</p>
                  <p className="text-2xl font-semibold text-white">
                    {students.length > 0
                      ? Math.round(
                          students.reduce((total, student) => total + (studentPerformanceById[student.student_id]?.averageScore || 0), 0) /
                            students.length,
                        )
                      : 0}
                    %
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

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
                    <p className="font-medium text-white">{student.profiles?.full_name || 'Student'}</p>
                    <p className="text-sm text-slate-300">{student.profiles?.email || 'No email'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="border-cyan-500/40 bg-cyan-500/15 text-cyan-200">
                        <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
                        Lessons: {studentPerformanceById[student.student_id]?.lessonsCompleted || 0}
                      </Badge>
                      <Badge className="border-blue-500/40 bg-blue-500/15 text-blue-200">
                        <BarChart3 className="mr-1 h-3.5 w-3.5" />
                        Avg: {studentPerformanceById[student.student_id]?.averageScore || 0}%
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300 mt-2">
                      Submitted: {studentPerformanceById[student.student_id]?.assignmentsSubmitted || 0} | Graded:{' '}
                      {studentPerformanceById[student.student_id]?.assignmentsGraded || 0}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notion Responses</CardTitle>
            <CardDescription>
              Student multiple-choice notion answers from notes lessons.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notionSubmissions.length === 0 ? (
              <p className="text-sm text-slate-300">No notion responses yet.</p>
            ) : (
              <div className="space-y-3">
                {notionSubmissions.map((row) => {
                  const student = students.find((item) => item.student_id === row.student_id)
                  const options = Array.isArray(row.question?.options) ? row.question.options : []
                  const selectedIndex = Number.isFinite(Number(row.selected_index)) ? Number(row.selected_index) : -1
                  const correctIndex = Number.isFinite(Number(row.question?.correct_index)) ? Number(row.question.correct_index) : -1
                  return (
                    <div key={row.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="text-sm text-white font-medium">
                        {student?.profiles?.full_name || student?.profiles?.email || 'Student'} - {row.question?.lesson?.title || 'Lesson'}
                      </p>
                      <p className="text-sm text-slate-200 mt-1">{row.question?.prompt || 'Notion question'}</p>
                      <p className="text-xs text-slate-300 mt-1">
                        Selected: {selectedIndex >= 0 ? options[selectedIndex] || `Option ${selectedIndex + 1}` : 'No answer'}
                      </p>
                      <p className="text-xs text-slate-300">
                        Correct: {correctIndex >= 0 ? options[correctIndex] || `Option ${correctIndex + 1}` : 'N/A'}
                      </p>
                      <p className={`text-xs mt-1 ${row.is_correct ? 'text-emerald-300' : 'text-orange-300'}`}>
                        {row.is_correct ? 'Correct' : 'Needs review'} - Score: {row.score ?? 0}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Assignments</h2>
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
                  <Label htmlFor="assignment-type">Assignment Type</Label>
                  <select
                    id="assignment-type"
                    value={newAssignmentData.assignmentType}
                    onChange={(e) =>
                      setNewAssignmentData({
                        ...newAssignmentData,
                        assignmentType: e.target.value as 'coding' | 'quiz',
                      })
                    }
                    disabled={creatingAssignment}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="coding">Coding Assignment</option>
                    <option value="quiz">Quiz (Multiple Choice)</option>
                  </select>
                </div>

                {newAssignmentData.assignmentType === 'coding' ? (
                  <>
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
                  </>
                ) : (
                  <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-100">Quiz Questions</p>
                      <Button type="button" size="sm" variant="outline" onClick={addQuizQuestion} disabled={creatingAssignment}>
                        Add Question
                      </Button>
                    </div>

                    {newAssignmentData.quizQuestions.map((question, questionIndex) => (
                      <div key={question.id} className="rounded-md border border-white/10 bg-black/20 p-3 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-slate-300">Question {questionIndex + 1}</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => removeQuizQuestion(question.id)}
                            disabled={creatingAssignment || newAssignmentData.quizQuestions.length === 1}
                          >
                            Remove
                          </Button>
                        </div>
                        <Input
                          value={question.prompt}
                          onChange={(e) => updateQuizQuestion(question.id, (prev) => ({ ...prev, prompt: e.target.value }))}
                          placeholder="Question prompt"
                          disabled={creatingAssignment}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {question.options.map((option, optionIndex) => (
                            <Input
                              key={`${question.id}-option-${optionIndex}`}
                              value={option}
                              onChange={(e) =>
                                updateQuizQuestion(question.id, (prev) => {
                                  const options = [...prev.options]
                                  options[optionIndex] = e.target.value
                                  return { ...prev, options }
                                })
                              }
                              placeholder={`Option ${optionIndex + 1}`}
                              disabled={creatingAssignment}
                            />
                          ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <Label className="mb-1 block">Correct Option</Label>
                            <select
                              value={question.correctIndex}
                              onChange={(e) =>
                                updateQuizQuestion(question.id, (prev) => ({
                                  ...prev,
                                  correctIndex: Number(e.target.value),
                                }))
                              }
                              className="w-full px-3 py-2 border border-input rounded-md bg-background"
                            >
                              <option value={0}>Option 1</option>
                              <option value={1}>Option 2</option>
                              <option value={2}>Option 3</option>
                              <option value={3}>Option 4</option>
                            </select>
                          </div>
                          <div>
                            <Label className="mb-1 block">Points</Label>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={question.points}
                              onChange={(e) =>
                                updateQuizQuestion(question.id, (prev) => ({
                                  ...prev,
                                  points: Math.max(1, Number(e.target.value) || 1),
                                }))
                              }
                              disabled={creatingAssignment}
                            />
                          </div>
                        </div>
                        <Input
                          value={question.explanation}
                          onChange={(e) => updateQuizQuestion(question.id, (prev) => ({ ...prev, explanation: e.target.value }))}
                          placeholder="Explanation (shown in grading view)"
                          disabled={creatingAssignment}
                        />
                      </div>
                    ))}
                  </div>
                )}

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
                        <CardTitle className="text-white">{assignment.title}</CardTitle>
                        <CardDescription className="text-slate-300">{assignment.description}</CardDescription>
                      </div>
                      <div className="text-right">
                        {assignment.language === 'quiz' ? (
                          <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-200">Quiz</Badge>
                        ) : (
                          <p className="text-xs text-slate-400">
                            {assignment.language?.charAt(0).toUpperCase() + assignment.language?.slice(1)}
                          </p>
                        )}
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
