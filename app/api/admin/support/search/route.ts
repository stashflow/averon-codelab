import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
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

async function assertFullAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, status: 401, error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'full_admin') return { ok: false, status: 403, error: 'Forbidden' }
  return { ok: true }
}

async function runWithDeletedAtFallback(runFiltered: () => any, runUnfiltered: () => any) {
  const filtered = await runFiltered()
  if (!filtered.error) return filtered
  if (isMissingSchemaError(filtered.error)) {
    return runUnfiltered()
  }
  return filtered
}

async function fetchLastSignInMap(admin: any, userIds: string[]) {
  const pending = new Set(userIds.filter(Boolean))
  const byId: Record<string, string | null> = {}
  if (!pending.size) return byId

  let page = 1
  const perPage = 200

  while (pending.size > 0) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) break

    const users = data?.users || []
    for (const authUser of users) {
      if (pending.has(authUser.id)) {
        byId[authUser.id] = authUser.last_sign_in_at || null
        pending.delete(authUser.id)
      }
    }

    if (users.length < perPage) break
    page += 1
    if (page > 50) break
  }

  return byId
}

async function fetchUsersWithContext(admin: any, q: string, limit: number) {
  const queryUsers = (fields: string, filterDeleted: boolean) => {
    let query = admin.from('profiles').select(fields)
    if (filterDeleted) query = query.is('deleted_at', null)
    if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
    return query.limit(limit)
  }

  const fieldCandidates = [
    { fields: 'id, email, full_name, role, created_at, deleted_at, district_id, school_id', filterDeleted: true },
    { fields: 'id, email, full_name, role, created_at, deleted_at', filterDeleted: true },
    { fields: 'id, email, full_name, role, created_at, district_id, school_id', filterDeleted: false },
    { fields: 'id, email, full_name, role, created_at', filterDeleted: false },
  ]

  let users: any[] = []
  let lastError: any = null

  for (const candidate of fieldCandidates) {
    const { data, error } = await queryUsers(candidate.fields, candidate.filterDeleted)
    if (!error) {
      users = data || []
      lastError = null
      break
    }
    lastError = error
    if (!isMissingSchemaError(error)) break
  }

  if (lastError) throw lastError

  const districtIds = Array.from(new Set(users.map((u: any) => u.district_id).filter(Boolean)))
  const schoolIds = Array.from(new Set(users.map((u: any) => u.school_id).filter(Boolean)))

  const [districtsRes, schoolsRes, lastSignInById] = await Promise.all([
    districtIds.length
      ? admin.from('districts').select('id, name').in('id', districtIds)
      : Promise.resolve({ data: [], error: null } as any),
    schoolIds.length
      ? admin.from('schools').select('id, name').in('id', schoolIds)
      : Promise.resolve({ data: [], error: null } as any),
    fetchLastSignInMap(admin, users.map((u: any) => u.id)),
  ])

  if (districtsRes.error && !isMissingSchemaError(districtsRes.error)) throw districtsRes.error
  if (schoolsRes.error && !isMissingSchemaError(schoolsRes.error)) throw schoolsRes.error

  const districtById = Object.fromEntries((districtsRes.data || []).map((d: any) => [d.id, d.name]))
  const schoolById = Object.fromEntries((schoolsRes.data || []).map((s: any) => [s.id, s.name]))

  return users.map((user: any) => ({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    created_at: user.created_at,
    deleted_at: user.deleted_at,
    district_name: user.district_id ? districtById[user.district_id] || undefined : undefined,
    school_name: user.school_id ? schoolById[user.school_id] || undefined : undefined,
    last_sign_in_at: lastSignInById[user.id] || null,
  }))
}

export async function GET(request: Request) {
  try {
    const auth = await assertFullAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const admin = getAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'users'
    const q = (searchParams.get('q') || '').trim()
    const limitRaw = Number(searchParams.get('limit') || '50')
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 50

    if (type === 'users') {
      const items = await fetchUsersWithContext(admin, q, limit)
      return NextResponse.json({ items })
    }

    if (type === 'districts') {
      const { data: districts, error } = await runWithDeletedAtFallback(
        () => {
          let query = admin.from('districts').select('id, name, created_at, deleted_at').is('deleted_at', null)
          if (q) query = query.ilike('name', `%${q}%`)
          return query.limit(limit)
        },
        () => {
          let query = admin.from('districts').select('id, name, created_at')
          if (q) query = query.ilike('name', `%${q}%`)
          return query.limit(limit)
        },
      )
      if (error) throw error

      const districtIds = (districts || []).map((d: any) => d.id)
      const [schoolsRes, adminsRes] = await Promise.all([
        districtIds.length
          ? runWithDeletedAtFallback(
              () => admin.from('schools').select('id, district_id').in('district_id', districtIds).is('deleted_at', null),
              () => admin.from('schools').select('id, district_id').in('district_id', districtIds),
            )
          : Promise.resolve({ data: [], error: null } as any),
        districtIds.length
          ? admin.from('district_admins').select('id, district_id').in('district_id', districtIds)
          : Promise.resolve({ data: [], error: null } as any),
      ])
      if (schoolsRes.error) throw schoolsRes.error
      if (adminsRes.error) throw adminsRes.error

      const schoolCountByDistrict: Record<string, number> = {}
      for (const row of schoolsRes.data || []) {
        schoolCountByDistrict[row.district_id] = (schoolCountByDistrict[row.district_id] || 0) + 1
      }
      const adminCountByDistrict: Record<string, number> = {}
      for (const row of adminsRes.data || []) {
        adminCountByDistrict[row.district_id] = (adminCountByDistrict[row.district_id] || 0) + 1
      }

      const items = (districts || []).map((d: any) => ({
        ...d,
        school_count: schoolCountByDistrict[d.id] || 0,
        user_count: adminCountByDistrict[d.id] || 0,
      }))
      return NextResponse.json({ items })
    }

    if (type === 'schools') {
      const { data: schools, error } = await runWithDeletedAtFallback(
        () => {
          let query = admin.from('schools').select('id, name, district_id, created_at, deleted_at').is('deleted_at', null)
          if (q) query = query.ilike('name', `%${q}%`)
          return query.limit(limit)
        },
        () => {
          let query = admin.from('schools').select('id, name, district_id, created_at')
          if (q) query = query.ilike('name', `%${q}%`)
          return query.limit(limit)
        },
      )
      if (error) throw error

      const schoolIds = (schools || []).map((s: any) => s.id)
      const districtIds = Array.from(new Set((schools || []).map((s: any) => s.district_id).filter(Boolean)))

      const [districtsRes, classroomsRes, adminsRes] = await Promise.all([
        districtIds.length
          ? admin.from('districts').select('id, name').in('id', districtIds)
          : Promise.resolve({ data: [], error: null } as any),
        schoolIds.length
          ? runWithDeletedAtFallback(
              () => admin.from('classrooms').select('id, school_id').in('school_id', schoolIds).is('deleted_at', null),
              () => admin.from('classrooms').select('id, school_id').in('school_id', schoolIds),
            )
          : Promise.resolve({ data: [], error: null } as any),
        schoolIds.length
          ? admin.from('school_admins').select('id, school_id').in('school_id', schoolIds)
          : Promise.resolve({ data: [], error: null } as any),
      ])

      if (districtsRes.error) throw districtsRes.error
      if (classroomsRes.error) throw classroomsRes.error
      if (adminsRes.error) throw adminsRes.error

      const districtById = Object.fromEntries((districtsRes.data || []).map((d: any) => [d.id, d.name]))
      const classroomCountBySchool: Record<string, number> = {}
      for (const row of classroomsRes.data || []) {
        classroomCountBySchool[row.school_id] = (classroomCountBySchool[row.school_id] || 0) + 1
      }
      const adminCountBySchool: Record<string, number> = {}
      for (const row of adminsRes.data || []) {
        adminCountBySchool[row.school_id] = (adminCountBySchool[row.school_id] || 0) + 1
      }

      const items = (schools || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        district_name: districtById[s.district_id] || 'Unknown',
        created_at: s.created_at,
        deleted_at: s.deleted_at,
        classroom_count: classroomCountBySchool[s.id] || 0,
        user_count: adminCountBySchool[s.id] || 0,
      }))
      return NextResponse.json({ items })
    }

    if (type === 'classrooms') {
      const { data: classrooms, error } = await runWithDeletedAtFallback(
        () => {
          let query = admin.from('classrooms').select('id, name, school_id, teacher_id, created_at, deleted_at').is('deleted_at', null)
          if (q) query = query.ilike('name', `%${q}%`)
          return query.limit(limit)
        },
        () => {
          let query = admin.from('classrooms').select('id, name, school_id, teacher_id, created_at')
          if (q) query = query.ilike('name', `%${q}%`)
          return query.limit(limit)
        },
      )
      if (error) throw error

      const schoolIds = Array.from(new Set((classrooms || []).map((c: any) => c.school_id).filter(Boolean)))
      const teacherIds = Array.from(new Set((classrooms || []).map((c: any) => c.teacher_id).filter(Boolean)))
      const classIds = (classrooms || []).map((c: any) => c.id)

      const [schoolsRes, teachersRes, enrollmentsRes] = await Promise.all([
        schoolIds.length
          ? admin.from('schools').select('id, name, district_id').in('id', schoolIds)
          : Promise.resolve({ data: [], error: null } as any),
        teacherIds.length
          ? admin.from('profiles').select('id, full_name').in('id', teacherIds)
          : Promise.resolve({ data: [], error: null } as any),
        classIds.length
          ? admin.from('enrollments').select('id, classroom_id').in('classroom_id', classIds)
          : Promise.resolve({ data: [], error: null } as any),
      ])

      if (schoolsRes.error) throw schoolsRes.error
      if (teachersRes.error) throw teachersRes.error
      if (enrollmentsRes.error) throw enrollmentsRes.error

      const districtIds = Array.from(new Set((schoolsRes.data || []).map((s: any) => s.district_id).filter(Boolean)))
      const { data: districts, error: districtsError } = districtIds.length
        ? await admin.from('districts').select('id, name').in('id', districtIds)
        : ({ data: [], error: null } as any)
      if (districtsError) throw districtsError

      const schoolById = Object.fromEntries((schoolsRes.data || []).map((s: any) => [s.id, s]))
      const districtById = Object.fromEntries((districts || []).map((d: any) => [d.id, d.name]))
      const teacherById = Object.fromEntries((teachersRes.data || []).map((t: any) => [t.id, t.full_name]))
      const enrollmentCountByClass: Record<string, number> = {}
      for (const row of enrollmentsRes.data || []) {
        enrollmentCountByClass[row.classroom_id] = (enrollmentCountByClass[row.classroom_id] || 0) + 1
      }

      const items = (classrooms || []).map((c: any) => {
        const school = schoolById[c.school_id]
        return {
          id: c.id,
          name: c.name,
          school_name: school?.name || 'Unknown',
          district_name: districtById[school?.district_id] || 'Unknown',
          teacher_name: teacherById[c.teacher_id] || 'Unknown',
          student_count: enrollmentCountByClass[c.id] || 0,
          created_at: c.created_at,
          deleted_at: c.deleted_at,
        }
      })
      return NextResponse.json({ items })
    }

    return NextResponse.json({ error: 'Unsupported search type' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Search failed' }, { status: 500 })
  }
}
