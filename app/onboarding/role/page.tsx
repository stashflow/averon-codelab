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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950 flex items-center justify-center">
        <p className="text-slate-300">Loading role setup...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Confirm Your Role</h2>
            <p className="text-slate-400 mt-1">Select your primary role to continue.</p>
          </div>
          <RadioGroup value={role} onValueChange={(value) => setRole(value as 'student' | 'teacher')}>
            <div className="flex items-center space-x-3 border border-white/10 rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
              <RadioGroupItem value="student" id="student" />
              <Label htmlFor="student" className="text-white cursor-pointer flex-1">Student: I join classes and complete assignments.</Label>
            </div>
            <div className="flex items-center space-x-3 border border-white/10 rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
              <RadioGroupItem value="teacher" id="teacher" />
              <Label htmlFor="teacher" className="text-white cursor-pointer flex-1">Teacher: I create classes and manage students.</Label>
            </div>
          </RadioGroup>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
            <Checkbox id="confirm-role" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} className="mt-0.5" />
            <Label htmlFor="confirm-role" className="text-slate-300 cursor-pointer">I confirm this role selection is correct.</Label>
          </div>

          <Button onClick={saveRole} disabled={saving || !confirmed} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 border-0">
            {saving ? 'Saving...' : 'Confirm Role'}
          </Button>
        </div>
      </div>
    </div>
  )
}
