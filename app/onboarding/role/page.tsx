'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'

export const dynamic = 'force-dynamic'

export default function RoleOnboardingPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [confirmed, setConfirmed] = useState(false)
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const validRoles = new Set(['full_admin', 'district_admin', 'school_admin', 'teacher', 'student'])
      if (profile?.role && validRoles.has(profile.role)) {
        router.push('/protected')
        return
      }

      setLoading(false)
    }

    load()
  }, [router])

  async function saveRole() {
    if (!confirmed) return
    setSaving(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', user.id)

    if (error) {
      alert(error.message)
      setSaving(false)
      return
    }

    if (role === 'teacher') {
      router.push('/onboarding/teacher')
      return
    }

    router.push('/student/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading role setup...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Confirm Your Role</CardTitle>
          <CardDescription>Select your primary role to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={role} onValueChange={(value) => setRole(value as 'student' | 'teacher')}>
            <div className="flex items-center space-x-2 border rounded-md p-3">
              <RadioGroupItem value="student" id="student" />
              <Label htmlFor="student">Student: I join classes and complete assignments.</Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-md p-3">
              <RadioGroupItem value="teacher" id="teacher" />
              <Label htmlFor="teacher">Teacher: I create classes and manage students.</Label>
            </div>
          </RadioGroup>

          <div className="flex items-start gap-3">
            <Checkbox id="confirm-role" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} />
            <Label htmlFor="confirm-role">I confirm this role selection is correct.</Label>
          </div>

          <Button onClick={saveRole} disabled={saving || !confirmed} className="w-full">
            {saving ? 'Saving...' : 'Confirm Role'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
