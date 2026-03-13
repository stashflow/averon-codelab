import type { Session, SupabaseClient, User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'
import type { AppRole } from '@/lib/security/role-scope'

export type ClientProfile = {
  id?: string
  role?: string | null
  full_name?: string | null
  email?: string | null
  school_id?: string | null
}

type ClientAuthContext<TProfile extends ClientProfile> = {
  supabase: SupabaseClient<any, 'public', any>
  user: User | null
  session: Session | null
  profile: TProfile | null
  missingSchoolIdColumn: boolean
}

type ResolveAppPathOptions = {
  missingSchoolIdColumn?: boolean
}

const VALID_APP_ROLES = new Set<AppRole>([
  'full_admin',
  'district_admin',
  'school_admin',
  'teacher',
  'student',
])

function splitSelectFields(select: string) {
  return select
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean)
}

function removeSelectField(select: string, fieldName: string) {
  return splitSelectFields(select)
    .filter((field) => field !== fieldName)
    .join(', ')
}

function isMissingColumnError(error: unknown, columnName: string) {
  const typedError = error as { code?: string; message?: string } | null
  const message = String(typedError?.message || '').toLowerCase()
  return typedError?.code === '42703' || message.includes(columnName.toLowerCase())
}

function castProfile<TProfile extends ClientProfile>(value: unknown): TProfile | null {
  return (value as TProfile | null) ?? null
}

function asProfileRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

export function hasAppRole(role: string | null | undefined): role is AppRole {
  return VALID_APP_ROLES.has(role as AppRole)
}

export async function getClientProfile<TProfile extends ClientProfile = ClientProfile>(
  supabase: SupabaseClient<any, 'public', any>,
  userId: string,
  select = 'id, role, school_id',
): Promise<{ profile: TProfile | null; missingSchoolIdColumn: boolean }> {
  const wantsSchoolId = splitSelectFields(select).includes('school_id')

  const profileWithSchool = await supabase
    .from('profiles')
    .select(select)
    .eq('id', userId)
    .single()

  if (!profileWithSchool.error) {
    return {
      profile: castProfile<TProfile>(profileWithSchool.data),
      missingSchoolIdColumn: false,
    }
  }

  if (!wantsSchoolId || !isMissingColumnError(profileWithSchool.error, 'school_id')) {
    throw profileWithSchool.error
  }

  const fallbackSelect = removeSelectField(select, 'school_id') || 'id'
  const fallbackProfile = await supabase
    .from('profiles')
    .select(fallbackSelect)
    .eq('id', userId)
    .single()

  if (fallbackProfile.error) {
    throw fallbackProfile.error
  }

  return {
    profile: asProfileRecord(fallbackProfile.data)
      ? castProfile<TProfile>({
          ...asProfileRecord(fallbackProfile.data),
          school_id: null,
        })
      : null,
    missingSchoolIdColumn: true,
  }
}

export async function getClientAuthContext<TProfile extends ClientProfile = ClientProfile>(options?: {
  profileSelect?: string
}): Promise<ClientAuthContext<TProfile>> {
  const supabase = createClient()
  const [userResult, sessionResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ])

  const user = userResult.data.user ?? null
  const session = sessionResult.data.session ?? null

  if (!user) {
    return {
      supabase,
      user: null,
      session,
      profile: null,
      missingSchoolIdColumn: false,
    }
  }

  const { profile, missingSchoolIdColumn } = await getClientProfile<TProfile>(
    supabase,
    user.id,
    options?.profileSelect,
  )

  return {
    supabase,
    user,
    session,
    profile,
    missingSchoolIdColumn,
  }
}

export async function resolveAuthenticatedAppPath(
  supabase: SupabaseClient<any, 'public', any>,
  userId: string,
  profile: Pick<ClientProfile, 'role' | 'school_id'> | null,
  options?: ResolveAppPathOptions,
) {
  if (!hasAppRole(profile?.role)) {
    return '/onboarding/role'
  }

  if (profile.role === 'full_admin') {
    return '/admin/panel'
  }

  const [{ data: districtAdmin }, { data: schoolAdmin }] = await Promise.all([
    supabase.from('district_admins').select('id').eq('admin_id', userId).maybeSingle(),
    supabase.from('school_admins').select('id').eq('admin_id', userId).maybeSingle(),
  ])

  if (profile.role === 'district_admin' || districtAdmin) {
    return '/district/admin'
  }

  if (profile.role === 'school_admin' || schoolAdmin) {
    return '/school/admin'
  }

  if (profile.role === 'teacher') {
    if (options?.missingSchoolIdColumn || profile.school_id) {
      return '/protected/teacher'
    }

    return '/onboarding/teacher'
  }

  return '/student/dashboard'
}
