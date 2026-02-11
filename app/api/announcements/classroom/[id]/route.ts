import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    const [{ data: classroom }, { data: enrollment }, { data: profile }] = await Promise.all([
      supabase.from('classrooms').select('id, teacher_id').eq('id', classroom_id).single(),
      supabase.from('enrollments').select('id').eq('classroom_id', classroom_id).eq('student_id', user.id).maybeSingle(),
      supabase.from('profiles').select('role').eq('id', user.id).single(),
    ])

    const isElevatedRole = ['full_admin', 'district_admin', 'school_admin'].includes(profile?.role || '')
    const isTeacherForClass = classroom?.teacher_id === user.id
    const isEnrolledStudent = Boolean(enrollment)

    if (!classroom || (!isElevatedRole && !isTeacherForClass && !isEnrolledStudent)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get active announcements with teacher info
    const { data: announcements, error } = await supabase
      .from('class_announcements')
      .select(`
        *,
        teacher:teacher_id(id, full_name, email)
      `)
      .eq('classroom_id', classroom_id)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Error fetching announcements:', error)
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      )
    }

    return NextResponse.json({ announcements })
  } catch (error) {
    console.error('[v0] Error in get announcements route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
