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

async function countWithDeletedAtFallback(admin: any, table: string) {
  const filtered = await admin.from(table).select('id', { count: 'exact', head: true }).is('deleted_at', null)
  if (!filtered.error) return filtered.count || 0
  if (isMissingSchemaError(filtered.error)) {
    const unfiltered = await admin.from(table).select('id', { count: 'exact', head: true })
    if (unfiltered.error) throw unfiltered.error
    return unfiltered.count || 0
  }
  throw filtered.error
}

async function countActiveUsers24h(admin: any) {
  const cutoffMs = Date.now() - 24 * 60 * 60 * 1000
  let count = 0
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) break

    const users = data?.users || []
    if (!users.length) break

    for (const user of users) {
      if (!user.last_sign_in_at) continue
      const ts = Date.parse(user.last_sign_in_at)
      if (!Number.isNaN(ts) && ts >= cutoffMs) {
        count += 1
      }
    }

    if (users.length < perPage) break
    page += 1
    if (page > 100) break
  }

  return count
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

    const [totalUsers, totalDistricts, totalSchools, totalClassrooms, activeUsers24h] = await Promise.all([
      countWithDeletedAtFallback(admin, 'profiles'),
      countWithDeletedAtFallback(admin, 'districts'),
      countWithDeletedAtFallback(admin, 'schools'),
      countWithDeletedAtFallback(admin, 'classrooms'),
      countActiveUsers24h(admin),
    ])

    return NextResponse.json({
      totalUsers,
      totalDistricts,
      totalSchools,
      totalClassrooms,
      activeUsers24h,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load support stats' }, { status: 500 })
  }
}
