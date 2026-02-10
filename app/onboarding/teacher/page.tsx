'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default function TeacherOnboarding() {
  const [districts, setDistricts] = useState<any[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [districtId, setDistrictId] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const filteredSchools = useMemo(() => {
    if (!districtId) return schools
    return schools.filter((s) => s.district_id === districtId)
  }, [districtId, schools])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          router.push('/auth/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, school_id')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'teacher') {
          router.push('/protected')
          return
        }

        if (profile?.school_id) {
          router.push('/protected/teacher')
          return
        }

        const [{ data: districtData }, { data: schoolData }] = await Promise.all([
          supabase.from('districts').select('id, name').order('name', { ascending: true }),
          supabase.from('schools').select('id, name, district_id').eq('is_active', true).order('name', { ascending: true }),
        ])

        setDistricts(districtData || [])
        setSchools(schoolData || [])
      } catch (err: any) {
        console.error('[v0] onboarding load error', err)
        setError('Failed to load schools. Please try again.')
      } finally {
        setLoadingData(false)
      }
    }

    load()
  }, [router])

  async function assignSchool(selectedSchoolId: string) {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ school_id: selectedSchoolId })
        .eq('id', user.id)

      if (updateError) throw updateError

      router.push('/protected/teacher?onboarding=complete')
    } catch (err: any) {
      console.error('[v0] assign school error', err)
      setError(err.message || 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  async function handleManualSubmit() {
    if (!schoolId) {
      setError('School is required for teacher access.')
      return
    }
    await assignSchool(schoolId)
  }

  async function handleInviteRedeem() {
    if (!inviteToken.trim()) {
      setError('Enter your invite token.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/magic-links/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken.trim() }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to redeem invitation')
      }

      router.push('/protected')
    } catch (err: any) {
      setError(err.message || 'Failed to redeem invitation')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/70">Loading onboarding...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Join With Invitation</CardTitle>
            <CardDescription className="text-white/70">Use the secure magic link token from your administrator.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteToken" className="text-white">Invite Token</Label>
              <Input
                id="inviteToken"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder="Paste token"
                className="bg-black border-white/10 text-white"
              />
            </div>
            <Button
              onClick={handleInviteRedeem}
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
            >
              {loading ? 'Redeeming...' : 'Redeem Invitation'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Manual School Assignment</CardTitle>
            <CardDescription className="text-white/70">Select your district and school. School is required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="districtId" className="text-white">District</Label>
              <select
                id="districtId"
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value)
                  setSchoolId('')
                }}
                className="w-full h-10 rounded-md border border-white/10 bg-black text-white px-3"
              >
                <option value="">Select district</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>{district.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolId" className="text-white">School *</Label>
              <select
                id="schoolId"
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="w-full h-10 rounded-md border border-white/10 bg-black text-white px-3"
              >
                <option value="">Select school</option>
                {filteredSchools.map((school) => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleManualSubmit}
              disabled={loading || !schoolId}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
            >
              {loading ? 'Saving...' : 'Complete Onboarding'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-200 rounded-md">
          {error}
        </div>
      )}
    </div>
  )
}
