import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureValidCsrf } from '@/lib/security/csrf'

export async function POST(request: Request) {
  try {
    const csrfError = ensureValidCsrf(request)
    if (csrfError) return csrfError

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is full admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (userRole?.role !== 'full_admin') {
      return NextResponse.json({ error: 'Forbidden: Full admin access required' }, { status: 403 })
    }

    const { district_id } = await request.json()

    if (!district_id) {
      return NextResponse.json({ error: 'District ID is required' }, { status: 400 })
    }

    // Call the delete function
    const { data, error } = await supabase.rpc('admin_delete_district', {
      p_district_id: district_id,
      p_admin_id: user.id
    })

    if (error) {
      console.error('Error deleting district:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'District deleted successfully' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
