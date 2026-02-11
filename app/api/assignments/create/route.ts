import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureValidCsrf } from '@/lib/security/csrf'

export async function POST(request: Request) {
  try {
    const csrfError = ensureValidCsrf(request)
    if (csrfError) return csrfError

    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { classroom_id, lesson_ids, due_date, instructions, points_possible } = body

    if (!classroom_id || !lesson_ids || !Array.isArray(lesson_ids) || lesson_ids.length === 0) {
      return NextResponse.json(
        { error: 'Classroom ID and lesson IDs are required' },
        { status: 400 }
      )
    }

    const uniqueLessonIds = Array.from(new Set(lesson_ids.map((id: unknown) => String(id).trim()).filter(Boolean)))
    if (uniqueLessonIds.length === 0) {
      return NextResponse.json({ error: 'At least one valid lesson ID is required' }, { status: 400 })
    }
    if (uniqueLessonIds.length > 50) {
      return NextResponse.json({ error: 'Cannot assign more than 50 lessons at once' }, { status: 400 })
    }

    const parsedPoints = Number(points_possible)
    const safePoints = Number.isFinite(parsedPoints) ? Math.max(1, Math.min(1000, Math.round(parsedPoints))) : 100

    // Verify user is teacher/admin of the classroom
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('teacher_id')
      .eq('id', classroom_id)
      .single()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAuthorized =
      classroom?.teacher_id === user.id ||
      ['district_admin', 'school_admin', 'full_admin'].includes(profile?.role || '')

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Not authorized to create assignments in this classroom' },
        { status: 403 }
      )
    }

    // Create multiple assignments (one per lesson)
    const assignments = uniqueLessonIds.map((lesson_id) => ({
      classroom_id,
      lesson_id,
      assigned_by: user.id,
      due_date: due_date || null,
      instructions: instructions ? String(instructions).slice(0, 5000) : null,
      points_possible: safePoints,
      is_required: true,
    }))

    const { data, error } = await supabase
      .from('lesson_assignments')
      .insert(assignments)
      .select(`
        *,
        lesson:lesson_id(
          id,
          title,
          lesson_number,
          lesson_type,
          unit:unit_id(unit_number, title)
        )
      `)

    if (error) {
      console.error('[v0] Error creating assignments:', error)
      return NextResponse.json(
        { error: 'Failed to create assignments' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, assignments: data })
  } catch (error) {
    console.error('[v0] Error in create assignment route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
