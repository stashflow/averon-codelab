import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureValidCsrf } from '@/lib/security/csrf'
import { canUserManageClassroom } from '@/lib/security/role-scope'

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
    const { classroom_id, message, priority, expires_at } = body
    const classroomId = String(classroom_id || '').trim()

    if (!classroomId || !message) {
      return NextResponse.json(
        { error: 'Classroom ID and message are required' },
        { status: 400 }
      )
    }

    const safePriority = ['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : 'normal'
    const safeMessage = String(message).trim()
    if (!safeMessage) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }
    if (safeMessage.length > 5000) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 })
    }

    // Verify teacher ownership or admin scope (full/district/school).
    const isAuthorized = await canUserManageClassroom(supabase, user.id, classroomId)

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
        classroom_id: classroomId,
        teacher_id: user.id,
        message: safeMessage,
        priority: safePriority,
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
