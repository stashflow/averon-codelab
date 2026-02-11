import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student's enrolled classrooms
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('classroom_id')
      .eq('student_id', user.id)

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ assignments: [] })
    }

    const classroomIds = enrollments.map((e) => e.classroom_id)

    // Get assignments for those classrooms with progress
    const { data: assignments, error } = await supabase
      .from('lesson_assignments')
      .select(`
        *,
        lesson:lesson_id(
          id,
          title,
          lesson_number,
          lesson_type,
          estimated_minutes,
          unit:unit_id(
            unit_number,
            title,
            course:course_id(name)
          )
        ),
        classroom:classroom_id(
          name,
          teacher:teacher_id(full_name)
        ),
        progress:student_lesson_progress!student_lesson_progress_assignment_id_fkey(
          status,
          progress_percentage,
          score,
          completed_at
        )
      `)
      .in('classroom_id', classroomIds)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('[v0] Error fetching assignments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      )
    }

    // Also get progress not linked to assignments
    const lessonIds = assignments?.map((a) => a.lesson_id) || []
    const { data: allProgress } = await supabase
      .from('student_lesson_progress')
      .select('lesson_id, status, progress_percentage, score, completed_at')
      .eq('student_id', user.id)
      .in('lesson_id', lessonIds)

    // Merge progress data
    const progressByLesson = new Map((allProgress || []).map((p) => [p.lesson_id, p]))
    const enrichedAssignments = assignments?.map((assignment) => {
      const progress = progressByLesson.get(assignment.lesson_id)
      return {
        ...assignment,
        progress: progress || assignment.progress?.[0] || null,
      }
    })

    return NextResponse.json({ assignments: enrichedAssignments })
  } catch (error) {
    console.error('[v0] Error in get student assignments route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
