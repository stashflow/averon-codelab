import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // Allow SSR/build of client components in environments where public envs
    // are not injected yet. In a real browser runtime, preserve the explicit error.
    if (typeof window !== 'undefined') {
      console.error('[v0] Supabase environment variables are not set')
      console.error('[v0] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING')
      console.error('[v0] NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'MISSING')
      throw new Error('Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
    }

    return createBrowserClient('https://placeholder.supabase.co', 'placeholder-anon-key')
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
