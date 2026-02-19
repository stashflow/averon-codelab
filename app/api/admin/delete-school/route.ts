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

async function safeDeleteById(admin: any, table: string, id: string) {
  const { error } = await admin.from(table).delete().eq('id', id)
  if (error && !isMissingSchemaError(error)) throw error
}

async function safeDelete(admin: any, table: string, column: string, value: string) {
  const { error } = await admin.from(table).delete().eq(column, value)
  if (error && !isMissingSchemaError(error)) throw error
}

async function safeUpdate(admin: any, table: string, values: Record<string, any>, column: string, value: string) {
  const { error } = await admin.from(table).update(values).eq(column, value)
  if (error && !isMissingSchemaError(error)) throw error
}

async function deleteClassroom(admin: any, classroomId: string) {
  await safeDelete(admin, 'enrollments', 'classroom_id', classroomId)
  await safeDelete(admin, 'lesson_assignments', 'classroom_id', classroomId)
  await safeDelete(admin, 'messages', 'classroom_id', classroomId)
  await safeDelete(admin, 'classroom_course_offerings', 'classroom_id', classroomId)
  await safeDeleteById(admin, 'classrooms', classroomId)
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

    const { school_id } = await request.json()

    if (!school_id) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 })
    }

    const { data: classrooms, error: classroomLookupError } = await admin
      .from('classrooms')
      .select('id')
      .eq('school_id', school_id)

    if (classroomLookupError && !isMissingSchemaError(classroomLookupError)) {
      throw classroomLookupError
    }

    for (const classroom of classrooms || []) {
      await deleteClassroom(admin, classroom.id)
    }

    await safeDelete(admin, 'school_admins', 'school_id', school_id)
    await safeUpdate(admin, 'profiles', { school_id: null }, 'school_id', school_id)
    await safeDelete(admin, 'magic_links', 'school_id', school_id)

    const { error: schoolError } = await admin
      .from('schools')
      .delete()
      .eq('id', school_id)

    if (schoolError) throw schoolError

    return NextResponse.json({ success: true, message: 'School permanently deleted' })
  } catch (error: any) {
    console.error('Error deleting school:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
