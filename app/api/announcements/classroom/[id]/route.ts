import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { canUserAccessClassroom } from '@/lib/security/role-scope'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: classroom_id } = await params

    if (!classroom_id) {
      return NextResponse.json({ error: 'Classroom ID is required' }, { status: 400 })
    }
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAuthorized = await canUserAccessClassroom(supabase, user.id, classroom_id)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const nowIso = new Date().toISOString()

    // Get active announcements with teacher info
    const { data: announcements, error } = await supabase
      .from('class_announcements')
      .select(`
        *,
        teacher:teacher_id(id, full_name, email)
      `)
      .eq('classroom_id', classroom_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Error fetching announcements:', error)
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      announcements: ((announcements as any[]) || []).filter(
        (announcement) => !announcement?.expires_at || announcement.expires_at > nowIso,
      ),
    })
  } catch (error) {
    console.error('[v0] Error in get announcements route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
