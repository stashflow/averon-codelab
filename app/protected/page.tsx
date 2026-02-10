'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function ProtectedRoute() {
  const router = useRouter()

  useEffect(() => {
    async function checkRoleAndRedirect() {
      const supabase = createClient()

      try {
        const {
          data: { user: authUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !authUser) {
          router.push('/auth/login')
          return
        }

        let profile: { role?: string; school_id?: string | null } | null = null
        const profileWithSchool = await supabase
          .from('profiles')
          .select('role, school_id')
          .eq('id', authUser.id)
          .single()

        if (profileWithSchool.error && profileWithSchool.error.message?.toLowerCase().includes('school_id')) {
          const profileWithoutSchool = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authUser.id)
            .single()

          profile = profileWithoutSchool.data ? { ...profileWithoutSchool.data, school_id: null } : null
        } else {
          profile = profileWithSchool.data
        }

        const validRoles = new Set(['full_admin', 'district_admin', 'school_admin', 'teacher', 'student'])
        if (!profile?.role || !validRoles.has(profile.role)) {
          router.push('/onboarding/role')
          return
        }

        if (profile?.role === 'full_admin') {
          router.push('/admin/panel')
          return
        }

        const [{ data: districtAdmin }, { data: schoolAdmin }] = await Promise.all([
          supabase.from('district_admins').select('id').eq('admin_id', authUser.id).maybeSingle(),
          supabase.from('school_admins').select('id').eq('admin_id', authUser.id).maybeSingle(),
        ])

        if (profile?.role === 'district_admin' || districtAdmin) {
          router.push('/district/admin')
          return
        }

        if (profile?.role === 'school_admin' || schoolAdmin) {
          router.push('/school/admin')
          return
        }

        if (profile?.role === 'teacher') {
          if (!profile.school_id) {
            router.push('/onboarding/teacher')
            return
          }
          router.push('/protected/teacher')
          return
        }

        router.push('/student/dashboard')
      } catch (err: any) {
        console.error('[v0] Error checking role:', err)
        router.push('/auth/login')
      }
    }

    checkRoleAndRedirect()
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-foreground text-base">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}
