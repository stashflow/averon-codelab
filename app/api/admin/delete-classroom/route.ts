import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureValidCsrf } from '@/lib/security/csrf'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createAdminClient(url, serviceKey, { auth: { persistSession: false } })
}

function isMissingSchemaError(error: any) {
  return error?.code === '42P01' || error?.code === '42703'
}

async function safeDelete(admin: any, table: string, column: string, value: string) {
  const { error } = await admin.from(table).delete().eq(column, value)
  if (error && !isMissingSchemaError(error)) throw error
}

export async function POST(request: Request) {
  try {
    const csrfError = ensureValidCsrf(request)
    if (csrfError) return csrfError

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRole } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userRole?.role !== 'full_admin') {
      return NextResponse.json({ error: 'Forbidden: Full admin access required' }, { status: 403 })
    }

    const admin = getAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })
    }

    const { classroom_id } = await request.json()

    if (!classroom_id) {
      return NextResponse.json({ error: 'Classroom ID is required' }, { status: 400 })
    }

    await safeDelete(admin, 'enrollments', 'classroom_id', classroom_id)
    await safeDelete(admin, 'lesson_assignments', 'classroom_id', classroom_id)
    await safeDelete(admin, 'messages', 'classroom_id', classroom_id)
    await safeDelete(admin, 'classroom_course_offerings', 'classroom_id', classroom_id)

    const { error: classroomError } = await admin
      .from('classrooms')
      .delete()
      .eq('id', classroom_id)

    if (classroomError) throw classroomError

    return NextResponse.json({ success: true, message: 'Classroom permanently deleted' })
  } catch (error: any) {
    console.error('Error deleting classroom:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
