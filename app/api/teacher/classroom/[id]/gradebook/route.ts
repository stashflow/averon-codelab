import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canUserManageClassroom } from '@/lib/security/role-scope'

function csvEscape(value: unknown) {
  const source = String(value ?? '')
  if (/[",\n]/.test(source)) {
    return `"${source.replace(/"/g, '""')}"`
  }
  return source
}

function lessonLabel(row: any) {
  const courseName = row?.lesson?.unit?.course?.name ? `${row.lesson.unit.course.name} ` : ''
  const unitNumber = row?.lesson?.unit?.unit_number ? `U${row.lesson.unit.unit_number}` : 'Unit'
  const lessonNumber = row?.lesson?.lesson_number ? `L${row.lesson.lesson_number}` : 'Lesson'
  const title = row?.lesson?.title || 'Lesson'
  return `${courseName}${unitNumber} ${lessonNumber}: ${title}`.trim()
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: classroomId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAuthorized = await canUserManageClassroom(supabase, user.id, classroomId)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [{ data: classroom }, { data: enrollments }, { data: assignments }, { data: lessonAssignments }] = await Promise.all([
      supabase.from('classrooms').select('id, name').eq('id', classroomId).single(),
      supabase.from('enrollments').select('student_id').eq('classroom_id', classroomId),
      supabase.from('assignments').select('id, title, due_date').eq('classroom_id', classroomId).order('created_at', { ascending: true }),
      supabase
        .from('lesson_assignments')
        .select(
          'id, lesson_id, due_date, points_possible, lesson:lesson_id(title, lesson_number, unit:unit_id(unit_number, course:course_id(name)))',
        )
        .eq('classroom_id', classroomId)
        .order('assigned_at', { ascending: true }),
    ])

    const studentIds = (enrollments || []).map((row: any) => row.student_id).filter(Boolean)
    const assignmentIds = (assignments || []).map((row: any) => row.id).filter(Boolean)
    const lessonIds = (lessonAssignments || []).map((row: any) => row.lesson_id).filter(Boolean)

    const [{ data: profiles }, { data: submissions }, { data: lessonProgress }] = await Promise.all([
      studentIds.length > 0
        ? supabase.from('profiles').select('id, full_name, email').in('id', studentIds)
        : Promise.resolve({ data: [] as any[] }),
      assignmentIds.length > 0
        ? supabase.from('submissions').select('student_id, assignment_id, status, score, submitted_at').in('assignment_id', assignmentIds)
        : Promise.resolve({ data: [] as any[] }),
      studentIds.length > 0 && lessonIds.length > 0
        ? supabase
            .from('student_lesson_progress')
            .select('student_id, lesson_id, status, score, completed_at')
            .in('student_id', studentIds)
            .in('lesson_id', lessonIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const profileMap = new Map((profiles || []).map((row: any) => [row.id, row]))

    const assignmentColumns = assignments || []
    const lessonColumns = lessonAssignments || []
    const submissionMap = new Map(
      (submissions || []).map((row: any) => [`${row.student_id}:${row.assignment_id}`, row]),
    )
    const progressMap = new Map(
      (lessonProgress || []).map((row: any) => [`${row.student_id}:${row.lesson_id}`, row]),
    )

    const header = [
      'Student Name',
      'Student Email',
      ...assignmentColumns.map((row: any) => `${row.title} (${row.due_date ? new Date(row.due_date).toLocaleDateString() : 'No due date'})`),
      ...lessonColumns.map((row: any) => `${lessonLabel(row)} (${row.due_date ? new Date(row.due_date).toLocaleDateString() : 'No due date'})`),
    ]

    const rows = (enrollments || []).map((enrollment: any) => {
      const base = [
        profileMap.get(enrollment.student_id)?.full_name || 'Student',
        profileMap.get(enrollment.student_id)?.email || '',
      ]

      const assignmentCells = assignmentColumns.map((assignment: any) => {
        const submission = submissionMap.get(`${enrollment.student_id}:${assignment.id}`)
        if (!submission) return 'Not submitted'
        if (typeof submission.score === 'number') return `${submission.score}% (${submission.status || 'graded'})`
        return submission.status || 'Submitted'
      })

      const lessonCells = lessonColumns.map((assignment: any) => {
        const progress = progressMap.get(`${enrollment.student_id}:${assignment.lesson_id}`)
        if (!progress) return 'Not started'
        const suffix = typeof progress.score === 'number' ? ` ${progress.score}%` : ''
        return `${progress.status || 'in_progress'}${suffix}`.trim()
      })

      return [...base, ...assignmentCells, ...lessonCells]
    })

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => csvEscape(cell)).join(','))
      .join('\n')

    const fileName = `${(classroom?.name || 'classroom').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-gradebook.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to export gradebook' }, { status: 500 })
  }
}
