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

    const { target_user_id } = await request.json()

    if (!target_user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (target_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Clear known references that can block auth.users deletion in stricter schemas.
    await Promise.all([
      safeDelete(admin, 'audit_logs', 'user_id', target_user_id),
      safeDelete(admin, 'class_requests', 'requested_by', target_user_id),
      safeUpdate(admin, 'class_requests', { reviewed_by: null }, 'reviewed_by', target_user_id),
      safeUpdate(admin, 'districts', { created_by: user.id }, 'created_by', target_user_id),
      safeUpdate(admin, 'district_admins', { assigned_by: null }, 'assigned_by', target_user_id),
      safeUpdate(admin, 'school_admins', { assigned_by: null }, 'assigned_by', target_user_id),
      safeUpdate(admin, 'classrooms', { activated_by: null }, 'activated_by', target_user_id),
      safeUpdate(admin, 'schools', { admin_id: null }, 'admin_id', target_user_id),
      safeUpdate(admin, 'schools', { created_by: null }, 'created_by', target_user_id),
      safeUpdate(admin, 'data_exports', { requested_by: null }, 'requested_by', target_user_id),
    ])

    // Delete in auth first so we avoid "profile deleted but auth user still exists" mismatches.
    const { error: authError } = await admin.auth.admin.deleteUser(target_user_id)
    if (authError) {
      console.error('Auth user deletion failed:', authError)
      return NextResponse.json({ error: authError.message || 'Failed to delete auth account' }, { status: 500 })
    }

    // Safety cleanup for environments where profile does not cascade from auth.users.
    const { error: profileCleanupError } = await admin.from('profiles').delete().eq('id', target_user_id)
    if (profileCleanupError && !isMissingSchemaError(profileCleanupError)) {
      throw profileCleanupError
    }

    return NextResponse.json({ success: true, message: 'Account permanently deleted' })
  } catch (error: any) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
