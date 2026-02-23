import type { SupabaseClient } from '@supabase/supabase-js'

export type AppRole = 'full_admin' | 'district_admin' | 'school_admin' | 'teacher' | 'student'

export type ActorScope = {
  userId: string
  role: string
  districtIds: Set<string>
  schoolIds: Set<string>
}

export type ClassroomScope = {
  id: string
  teacher_id: string | null
  school_id: string | null
  district_id: string | null
}

type ClassroomRow = {
  id: string
  teacher_id?: string | null
  school_id?: string | null
  district_id?: string | null
}

type ProfileRow = {
  role?: string | null
  district_id?: string | null
  school_id?: string | null
}

type EnrollmentRow = {
  id: string
}

function isMissingColumnError(error: any) {
  return error?.code === '42703'
}

function isMissingSchemaError(error: any) {
  return error?.code === '42P01' || isMissingColumnError(error)
}

async function selectClassroomWithFallback(
  supabase: SupabaseClient<any, 'public', any>,
  classroomId: string
): Promise<ClassroomRow | null> {
  const fieldAttempts = [
    'id, teacher_id, school_id, district_id',
    'id, teacher_id, school_id',
    'id, teacher_id, district_id',
    'id, teacher_id',
  ]

  for (const fields of fieldAttempts) {
    const result = await supabase.from('classrooms').select(fields).eq('id', classroomId).maybeSingle()

    if (!result.error) {
      return (result.data as ClassroomRow | null) || null
    }

    if (!isMissingColumnError(result.error)) {
      throw result.error
    }
  }

  return null
}

async function resolveDistrictIdForClassroom(
  supabase: SupabaseClient<any, 'public', any>,
  classroom: ClassroomRow
): Promise<string | null> {
  if (classroom.district_id) return classroom.district_id
  if (!classroom.school_id) return null

  const { data: school, error } = await supabase
    .from('schools')
    .select('district_id')
    .eq('id', classroom.school_id)
    .maybeSingle()

  if (error) {
    if (isMissingSchemaError(error)) return null
    throw error
  }
  return (school as { district_id?: string | null } | null)?.district_id || null
}

export async function getActorScope(
  supabase: SupabaseClient<any, 'public', any>,
  userId: string
): Promise<ActorScope | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, district_id, school_id')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw profileError

  const typedProfile = (profile as ProfileRow | null) || null
  const role = String(typedProfile?.role || '').trim()
  if (!role) return null

  const districtIds = new Set<string>()
  const schoolIds = new Set<string>()

  if (typedProfile?.district_id) districtIds.add(typedProfile.district_id)
  if (typedProfile?.school_id) schoolIds.add(typedProfile.school_id)

  if (role === 'district_admin') {
    const { data, error } = await supabase.from('district_admins').select('district_id').eq('admin_id', userId)
    if (error && !isMissingSchemaError(error)) throw error
    ;(data || []).forEach((row: any) => {
      if (row?.district_id) districtIds.add(String(row.district_id))
    })
  }

  if (role === 'school_admin') {
    const { data, error } = await supabase.from('school_admins').select('school_id').eq('admin_id', userId)
    if (error && !isMissingSchemaError(error)) throw error
    ;(data || []).forEach((row: any) => {
      if (row?.school_id) schoolIds.add(String(row.school_id))
    })
  }

  return {
    userId,
    role,
    districtIds,
    schoolIds,
  }
}

export async function getClassroomScope(
  supabase: SupabaseClient<any, 'public', any>,
  classroomId: string
): Promise<ClassroomScope | null> {
  const classroom = await selectClassroomWithFallback(supabase, classroomId)
  if (!classroom) return null

  const districtId = await resolveDistrictIdForClassroom(supabase, classroom)

  return {
    id: classroom.id,
    teacher_id: classroom.teacher_id || null,
    school_id: classroom.school_id || null,
    district_id: districtId,
  }
}

function canPrivilegedRoleManageClassroom(actor: ActorScope, classroom: ClassroomScope): boolean {
  if (actor.role === 'full_admin') return true

  if (actor.role === 'district_admin') {
    return Boolean(classroom.district_id && actor.districtIds.has(classroom.district_id))
  }

  if (actor.role === 'school_admin') {
    return Boolean(classroom.school_id && actor.schoolIds.has(classroom.school_id))
  }

  return false
}

export async function canUserManageClassroom(
  supabase: SupabaseClient<any, 'public', any>,
  userId: string,
  classroomId: string
): Promise<boolean> {
  const [actor, classroom] = await Promise.all([getActorScope(supabase, userId), getClassroomScope(supabase, classroomId)])
  if (!actor || !classroom) return false

  if (actor.role === 'teacher') {
    return classroom.teacher_id === userId
  }

  return canPrivilegedRoleManageClassroom(actor, classroom)
}

export async function canUserAccessClassroom(
  supabase: SupabaseClient<any, 'public', any>,
  userId: string,
  classroomId: string
): Promise<boolean> {
  const [actor, classroom] = await Promise.all([getActorScope(supabase, userId), getClassroomScope(supabase, classroomId)])
  if (!actor || !classroom) return false

  if (actor.role === 'teacher') {
    return classroom.teacher_id === userId
  }

  if (actor.role === 'student') {
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('student_id', userId)
      .maybeSingle<EnrollmentRow>()

    if (error) throw error
    return Boolean(enrollment)
  }

  return canPrivilegedRoleManageClassroom(actor, classroom)
}
