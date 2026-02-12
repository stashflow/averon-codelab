import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureValidCsrf } from '@/lib/security/csrf'

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

    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const { data, error: redeemError } = await supabase
      .rpc('redeem_magic_link', { raw_token: String(token).trim() })
      .single()

    if (redeemError || !data) {
      const message = redeemError?.message || 'Failed to redeem invitation'
      const lowered = message.toLowerCase()
      const status = lowered.includes('invalid invitation token') || lowered.includes('token is required') ? 400
        : lowered.includes('expired') ? 400
        : lowered.includes('different email') ? 403
        : 400
      return NextResponse.json({ error: message }, { status })
    }

    const redeemed = data as { role: string; school_id: string | null; district_id: string | null }

    return NextResponse.json({
      success: true,
      role: redeemed.role,
      school_id: redeemed.school_id,
      district_id: redeemed.district_id,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to redeem invitation' }, { status: 500 })
  }
}
