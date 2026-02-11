import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) return null
  return createAdminClient(url, serviceKey, { auth: { persistSession: false } })
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

export async function GET() {
  try {
    const auth = await assertFullAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const admin = getAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })
    }

    const [usersRes, districtsRes, schoolsRes, classroomsRes] = await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('districts').select('id', { count: 'exact', head: true }),
      admin.from('schools').select('id', { count: 'exact', head: true }),
      admin.from('classrooms').select('id', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      totalUsers: usersRes.count || 0,
      totalDistricts: districtsRes.count || 0,
      totalSchools: schoolsRes.count || 0,
      totalClassrooms: classroomsRes.count || 0,
      activeUsers24h: 0,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load support stats' }, { status: 500 })
  }
}
