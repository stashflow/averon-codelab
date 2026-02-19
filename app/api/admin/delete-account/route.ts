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

async function deleteClassroom(admin: any, classroomId: string) {
  await safeDelete(admin, 'enrollments', 'classroom_id', classroomId)
  await safeDelete(admin, 'lesson_assignments', 'classroom_id', classroomId)
  await safeDelete(admin, 'messages', 'classroom_id', classroomId)
  await safeDelete(admin, 'classroom_course_offerings', 'classroom_id', classroomId)

  const { error } = await admin.from('classrooms').delete().eq('id', classroomId)
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

    const { target_user_id } = await request.json()

    if (!target_user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (target_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const { data: teachingClasses, error: teachingClassLookupError } = await admin
      .from('classrooms')
      .select('id')
      .eq('teacher_id', target_user_id)

    if (teachingClassLookupError && !isMissingSchemaError(teachingClassLookupError)) {
      throw teachingClassLookupError
    }

    for (const classroom of teachingClasses || []) {
      await deleteClassroom(admin, classroom.id)
    }

    await safeDelete(admin, 'district_admins', 'admin_id', target_user_id)
    await safeDelete(admin, 'school_admins', 'admin_id', target_user_id)
    await safeDelete(admin, 'enrollments', 'student_id', target_user_id)
    await safeDelete(admin, 'course_enrollments', 'student_id', target_user_id)
    await safeDelete(admin, 'audit_logs', 'user_id', target_user_id)

    const { error: exportUpdateError } = await admin
      .from('data_exports')
      .update({ requested_by: null })
      .eq('requested_by', target_user_id)
    if (exportUpdateError && !isMissingSchemaError(exportUpdateError)) {
      throw exportUpdateError
    }

    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', target_user_id)

    if (profileError) throw profileError

    const { error: authError } = await admin.auth.admin.deleteUser(target_user_id)
    if (authError) {
      console.error('Auth user deletion failed after profile removal:', authError)
      return NextResponse.json({ error: authError.message || 'User profile deleted, but auth account removal failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Account permanently deleted' })
  } catch (error: any) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
