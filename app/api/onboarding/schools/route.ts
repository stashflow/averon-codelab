import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createAdminClient(url, serviceKey, { auth: { persistSession: false } })
}

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })
    }

    const [{ data: districts, error: districtsError }, { data: schools, error: schoolsError }] = await Promise.all([
      admin.from('districts').select('id, name').order('name', { ascending: true }),
      admin.from('schools').select('id, name, district_id, is_active').eq('is_active', true).order('name', { ascending: true }),
    ])

    if (districtsError) {
      return NextResponse.json({ error: districtsError.message }, { status: 400 })
    }

    if (schoolsError) {
      return NextResponse.json({ error: schoolsError.message }, { status: 400 })
    }

    return NextResponse.json({
      districts: districts || [],
      schools: schools || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load onboarding schools' }, { status: 500 })
  }
}

