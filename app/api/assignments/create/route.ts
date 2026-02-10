import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
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
    const assignments = lesson_ids.map((lesson_id) => ({
      classroom_id,
      lesson_id,
      assigned_by: user.id,
      due_date: due_date || null,
      instructions: instructions || null,
      points_possible: points_possible || 100,
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
