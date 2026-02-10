'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default function RoleSettingsPage() {
  const params = useParams<{ role: string }>()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setAuthorized(profile?.role === params.role || profile?.role === 'full_admin')
      setLoading(false)
    }

    load()
  }, [params.role, router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading role settings...</div>
  }

  if (!authorized) {
    return <div className="min-h-screen flex items-center justify-center">Not authorized.</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto p-6">
        <div className="mb-4">
          <Link href="/settings">
            <Button variant="outline">Back to Settings</Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">{params.role} Settings</CardTitle>
          </CardHeader>
          <CardContent>
            {params.role === 'school_admin' && <p>Manage school-level defaults and assignment preferences from this page.</p>}
            {params.role === 'district_admin' && <p>Manage district-level defaults, school provisioning, and policy guardrails.</p>}
            {params.role === 'teacher' && <p>Manage class defaults, notifications, and grading preferences.</p>}
            {params.role === 'student' && <p>Manage learning preferences and notifications.</p>}
            {params.role === 'full_admin' && <p>Manage global platform defaults and security controls.</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
