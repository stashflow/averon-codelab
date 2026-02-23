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

    const { data: userRole } = await supabase.from('profiles').select('role').eq('id', user.id).single()

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

    const schoolIds = (schools || []).map((s: any) => s.id)

    await Promise.all([
      safeDelete(admin, 'district_admins', 'district_id', district_id),
      safeDelete(admin, 'magic_links', 'district_id', district_id),
      safeDelete(admin, 'data_exports', 'district_id', district_id),
      safeUpdate(admin, 'profiles', { district_id: null, school_id: null }, 'district_id', district_id),
    ])

    if (schoolIds.length) {
      const { error: schoolClassroomDeleteError } = await admin.from('classrooms').delete().in('school_id', schoolIds)
      if (schoolClassroomDeleteError && !isMissingSchemaError(schoolClassroomDeleteError)) {
        throw schoolClassroomDeleteError
      }

      const { error: schoolDeleteError } = await admin.from('schools').delete().in('id', schoolIds)
      if (schoolDeleteError && !isMissingSchemaError(schoolDeleteError)) {
        throw schoolDeleteError
      }
    }

    // Clean up legacy classrooms that may only point to district_id.
    const { error: districtClassroomDeleteError } = await admin.from('classrooms').delete().eq('district_id', district_id)
    if (districtClassroomDeleteError && !isMissingSchemaError(districtClassroomDeleteError)) {
      throw districtClassroomDeleteError
    }

    const { error: districtError } = await admin.from('districts').delete().eq('id', district_id)
    if (districtError) throw districtError

    return NextResponse.json({ success: true, message: 'District permanently deleted' })
  } catch (error: any) {
    console.error('Error deleting district:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
