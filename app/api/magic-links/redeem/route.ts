import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { ensureValidCsrf } from '@/lib/security/csrf'

type InviteRole = 'full_admin' | 'district_admin' | 'school_admin' | 'teacher' | 'student'

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
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

    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const tokenHash = hashToken(token)

    const { data: link, error: linkError } = await supabase
      .from('magic_links')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .is('revoked_at', null)
      .single()

    if (linkError || !link) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 })
    }

    if (new Date(link.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invitation token has expired' }, { status: 400 })
    }

    if (!user.email) {
      return NextResponse.json({ error: 'Email missing from account' }, { status: 400 })
    }

    if (user.email.toLowerCase() !== String(link.email).toLowerCase()) {
      return NextResponse.json({ error: 'This invite is for a different email address' }, { status: 403 })
    }

    const role = link.role as InviteRole
    const updates: Record<string, any> = { role }

    // school_id is mandatory for teacher/school_admin in schema constraints
    if (role === 'teacher' || role === 'school_admin') {
      if (!link.school_id) {
        return NextResponse.json({ error: `Invite is missing school assignment for role ${role}` }, { status: 400 })
      }
      updates.school_id = link.school_id
    } else if (role === 'student' && link.school_id) {
      updates.school_id = link.school_id
    } else {
      updates.school_id = null
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    if (role === 'school_admin') {
      const { error: adminError } = await supabase
        .from('school_admins')
        .upsert({ admin_id: user.id, school_id: link.school_id, assigned_by: link.invited_by }, { onConflict: 'admin_id,school_id' })

      if (adminError) {
        return NextResponse.json({ error: adminError.message }, { status: 400 })
      }
    }

    if (role === 'district_admin') {
      if (!link.district_id) {
        return NextResponse.json({ error: 'Invite is missing district assignment for district_admin role' }, { status: 400 })
      }

      const { error: districtAdminError } = await supabase
        .from('district_admins')
        .upsert({ admin_id: user.id, district_id: link.district_id, assigned_by: link.invited_by }, { onConflict: 'district_id,admin_id' })

      if (districtAdminError) {
        return NextResponse.json({ error: districtAdminError.message }, { status: 400 })
      }
    }

    await supabase.from('magic_links').update({ used_at: new Date().toISOString() }).eq('id', link.id)

    return NextResponse.json({
      success: true,
      role,
      school_id: link.school_id,
      district_id: link.district_id,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to redeem invitation' }, { status: 500 })
  }
}
