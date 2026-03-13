'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { LoadingScreen } from '@/components/loading-screen'
import {
  getClientAuthContext,
  resolveAuthenticatedAppPath,
} from '@/lib/auth/client-auth'

export const dynamic = 'force-dynamic'

export default function ProtectedRoute() {
  const router = useRouter()

  useEffect(() => {
    async function checkRoleAndRedirect() {
      try {
        const {
          supabase,
          user,
          profile,
          missingSchoolIdColumn,
        } = await getClientAuthContext<{ role?: string | null; school_id?: string | null }>({
          profileSelect: 'role, school_id',
        })

        if (!user) {
          router.push('/auth/login')
          return
        }

        const destination = await resolveAuthenticatedAppPath(supabase, user.id, profile, {
          missingSchoolIdColumn,
        })
        router.push(destination)
      } catch (err: any) {
        console.error('[v0] Error checking role:', err)
        router.push('/auth/login')
      }
    }

    checkRoleAndRedirect()
  }, [router])

  return <LoadingScreen message="Redirecting to your dashboard..." />
}
