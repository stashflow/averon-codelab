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
    const { classroom_id, message, priority, expires_at } = body

    if (!classroom_id || !message) {
      return NextResponse.json(
        { error: 'Classroom ID and message are required' },
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
        { error: 'Not authorized to post announcements in this classroom' },
        { status: 403 }
      )
    }

    // Create announcement
    const { data: announcement, error } = await supabase
      .from('class_announcements')
      .insert({
        classroom_id,
        teacher_id: user.id,
        message,
        priority: priority || 'normal',
        expires_at: expires_at || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Error creating announcement:', error)
      return NextResponse.json(
        { error: 'Failed to create announcement' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, announcement })
  } catch (error) {
    console.error('[v0] Error in create announcement route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
