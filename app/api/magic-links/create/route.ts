import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { ensureValidCsrf } from '@/lib/security/csrf'

type InviteRole = 'full_admin' | 'district_admin' | 'school_admin' | 'teacher' | 'student'

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex')
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

    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    const role = (body.role || 'school_admin') as InviteRole
    const expiresInHours = Number(body.expires_in_hours || 72)

    const allowedRoles: InviteRole[] = ['full_admin', 'district_admin', 'school_admin', 'teacher', 'student']
    if (!email || !allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Valid email and role are required' }, { status: 400 })
    }

    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    if (!inviterProfile?.role) {
      return NextResponse.json({ error: 'Inviter has no role configured' }, { status: 403 })
    }

    let districtId: string | null = body.district_id || null
    let schoolId: string | null = body.school_id || null

    let schoolRow: any = null
    if (schoolId) {
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id, district_id')
        .eq('id', schoolId)
        .single()
      schoolRow = schoolData
      if (!schoolRow) {
        return NextResponse.json({ error: 'Invalid school_id' }, { status: 400 })
      }
      districtId = districtId || schoolRow.district_id
    }

    const inviterRole = inviterProfile.role as InviteRole

    if (role === 'full_admin' && inviterRole !== 'full_admin') {
      return NextResponse.json({ error: 'Only full admins can invite full admins' }, { status: 403 })
    }

    if (role === 'district_admin' && inviterRole !== 'full_admin') {
      return NextResponse.json({ error: 'Only full admins can invite district admins' }, { status: 403 })
    }

    if (role === 'district_admin' && !districtId) {
      return NextResponse.json({ error: 'district_id is required for district_admin invites' }, { status: 400 })
    }

    const requiresSchool = role === 'school_admin' || role === 'teacher' || role === 'student'
    if (requiresSchool && !schoolId) {
      return NextResponse.json({ error: 'school_id is required for this invite role' }, { status: 400 })
    }

    if (inviterRole === 'district_admin' || inviterRole === 'school_admin') {
      if (inviterRole === 'district_admin') {
        const { data: da } = await supabase
          .from('district_admins')
          .select('district_id')
          .eq('admin_id', user.id)

        const allowedDistrictIds = new Set((da || []).map((row: any) => row.district_id))

        if (role === 'full_admin' || role === 'district_admin') {
          return NextResponse.json({ error: 'District admins can only invite school admins, teachers, or students' }, { status: 403 })
        }

        if (!districtId || !allowedDistrictIds.has(districtId)) {
          return NextResponse.json({ error: 'District admin can only invite users within their district' }, { status: 403 })
        }
      }

      if (inviterRole === 'school_admin') {
        const { data: sa } = await supabase
          .from('school_admins')
          .select('school_id')
          .eq('admin_id', user.id)

        const allowedSchoolIds = new Set((sa || []).map((row: any) => row.school_id))

        if (!['teacher', 'student'].includes(role)) {
          return NextResponse.json({ error: 'School admins can only invite teachers or students' }, { status: 403 })
        }

        if (!schoolId || !allowedSchoolIds.has(schoolId)) {
          return NextResponse.json({ error: 'School admin can only invite users for their own school' }, { status: 403 })
        }
      }
    }

    if (inviterRole !== 'full_admin' && inviterRole !== 'district_admin' && inviterRole !== 'school_admin') {
      return NextResponse.json({ error: 'You do not have permission to create invites' }, { status: 403 })
    }

    const rawToken = randomToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()

    const metadata = {
      created_by_role: inviterRole,
      created_via: 'magic_link_panel',
    }

    const { error } = await supabase.from('magic_links').insert({
      token_hash: tokenHash,
      email,
      role,
      school_id: schoolId,
      district_id: districtId,
      invited_by: user.id,
      expires_at: expiresAt,
      metadata,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const inviteUrl = `${new URL(request.url).origin}/invite/${rawToken}`
    return NextResponse.json({ token: rawToken, invite_url: inviteUrl, expires_at: expiresAt })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create magic link' }, { status: 500 })
  }
}
