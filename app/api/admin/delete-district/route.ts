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

async function safeUpdate(admin: any, table: string, values: Record<string, any>, column: string, value: string) {
  const { error } = await admin.from(table).update(values).eq(column, value)
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

async function deleteSchool(admin: any, schoolId: string) {
  const { data: classrooms, error: classroomLookupError } = await admin
    .from('classrooms')
    .select('id')
    .eq('school_id', schoolId)

  if (classroomLookupError && !isMissingSchemaError(classroomLookupError)) {
    throw classroomLookupError
  }

  for (const classroom of classrooms || []) {
    await deleteClassroom(admin, classroom.id)
  }

  await safeDelete(admin, 'school_admins', 'school_id', schoolId)
  await safeUpdate(admin, 'profiles', { school_id: null }, 'school_id', schoolId)
  await safeDelete(admin, 'magic_links', 'school_id', schoolId)

  const { error: schoolError } = await admin.from('schools').delete().eq('id', schoolId)
  if (schoolError && !isMissingSchemaError(schoolError)) throw schoolError
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

    const { district_id } = await request.json()

    if (!district_id) {
      return NextResponse.json({ error: 'District ID is required' }, { status: 400 })
    }

    const { data: schools, error: schoolLookupError } = await admin
      .from('schools')
      .select('id')
      .eq('district_id', district_id)

    if (schoolLookupError && !isMissingSchemaError(schoolLookupError)) {
      throw schoolLookupError
    }

    for (const school of schools || []) {
      await deleteSchool(admin, school.id)
    }

    const { data: districtClassrooms, error: classroomLookupError } = await admin
      .from('classrooms')
      .select('id')
      .eq('district_id', district_id)

    if (classroomLookupError && !isMissingSchemaError(classroomLookupError)) {
      throw classroomLookupError
    }

    for (const classroom of districtClassrooms || []) {
      await deleteClassroom(admin, classroom.id)
    }

    await safeDelete(admin, 'district_admins', 'district_id', district_id)
    await safeDelete(admin, 'magic_links', 'district_id', district_id)
    await safeDelete(admin, 'data_exports', 'district_id', district_id)
    await safeUpdate(admin, 'profiles', { district_id: null, school_id: null }, 'district_id', district_id)

    const { error: districtError } = await admin
      .from('districts')
      .delete()
      .eq('id', district_id)

    if (districtError) throw districtError

    return NextResponse.json({ success: true, message: 'District permanently deleted' })
  } catch (error: any) {
    console.error('Error deleting district:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
