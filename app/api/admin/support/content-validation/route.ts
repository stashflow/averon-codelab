import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { validateCheckpointRow, type CurriculumValidationIssue } from '@/lib/curriculum/validation'

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
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const admin = getAdminClient()
    if (!admin) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })

    const { data, error } = await admin
      .from('checkpoints')
      .select('id,title,checkpoint_type,starter_code,required_function_name,required_signature')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error

    const issues: CurriculumValidationIssue[] = []
    ;(data || []).forEach((row: any) => {
      issues.push(...validateCheckpointRow(row))
    })

    return NextResponse.json({
      checked: (data || []).length,
      issueCount: issues.length,
      issues,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to validate curriculum content' }, { status: 500 })
  }
}
