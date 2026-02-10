import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[v0] OAuth callback error:', error)
      return NextResponse.redirect(`${origin}/auth/login?error=OAuth authentication failed`)
    }

    // Get user to check if profile exists
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Check if profile exists
      const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()

      // If no profile, create one. Role fallback remains student for OAuth.
      if (!profile) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
          role: user.user_metadata?.role || 'student',
          is_active: true,
        })
      } else {
        // Keep profile email in sync for OAuth sign-ins
        await supabase.from('profiles').update({ email: user.email }).eq('id', user.id)
      }
    }
  }

  // Redirect to protected route
  return NextResponse.redirect(`${origin}/protected`)
}
