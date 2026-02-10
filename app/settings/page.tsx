'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

interface Preferences {
  email_updates: boolean
  class_reminders: boolean
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [authUser, setAuthUser] = useState<any>(null)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '' })
  const [newEmail, setNewEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' })
  const [preferences, setPreferences] = useState<Preferences>({ email_updates: true, class_reminders: true })
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const prefsStorageKey = useMemo(() => (profile ? `acl:preferences:${profile.id}` : ''), [profile])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [userRes, sessionRes] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()])

      if (!userRes.data.user) {
        router.push('/auth/login')
        return
      }

      const user = userRes.data.user
      setAuthUser(user)
      setSessionInfo(sessionRes.data.session)

      const { data } = await supabase
        .from('profiles')
        .select('id, role, full_name, email, school_id')
        .eq('id', user.id)
        .single()

      if (!data?.role) {
        router.push('/onboarding/role')
        return
      }

      setProfile(data)
      const effectiveEmail = data?.email || user.email || ''
      setForm({ full_name: data?.full_name || '', email: effectiveEmail })
      setNewEmail(effectiveEmail)
      setLoading(false)
    }

    load()
  }, [router])

  useEffect(() => {
    if (!prefsStorageKey) return
    const raw = localStorage.getItem(prefsStorageKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      setPreferences({
        email_updates: parsed.email_updates ?? true,
        class_reminders: parsed.class_reminders ?? true,
      })
    } catch {
      // ignore malformed local preference payload
    }
  }, [prefsStorageKey])

  async function saveProfile() {
    if (!profile) return
    setSavingProfile(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name })
      .eq('id', profile.id)

    if (error) {
      alert(error.message)
    }

    setSavingProfile(false)
  }

  async function changeEmail() {
    if (!authUser) return
    if (!newEmail || !newEmail.includes('@')) {
      setEmailStatus('Enter a valid email address.')
      return
    }

    setSavingEmail(true)
    setEmailStatus(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.updateUser({ email: newEmail })
    if (authError) {
      setEmailStatus(authError.message)
      setSavingEmail(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', authUser.id)

    if (profileError) {
      setEmailStatus(`Auth updated. Profile email sync failed: ${profileError.message}`)
      setSavingEmail(false)
      return
    }

    setForm((prev) => ({ ...prev, email: newEmail }))
    setEmailStatus('Email update requested. Check your inbox to confirm the change.')
    setSavingEmail(false)
  }

  async function updatePassword() {
    if (!passwords.newPassword || passwords.newPassword.length < 8) {
      alert('Password must be at least 8 characters.')
      return
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      alert('Passwords do not match.')
      return
    }

    setSavingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: passwords.newPassword })

    if (error) {
      alert(error.message)
    } else {
      setPasswords({ newPassword: '', confirmPassword: '' })
      alert('Password updated successfully.')
    }

    setSavingPassword(false)
  }

  async function savePreferences() {
    if (!prefsStorageKey) return
    setSavingPrefs(true)
    localStorage.setItem(prefsStorageKey, JSON.stringify(preferences))
    setSavingPrefs(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose how the interface looks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="theme-select">Theme</Label>
            <select
              id="theme-select"
              value={theme || 'light'}
              onChange={(e) => setTheme(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your account profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Current Email</Label>
              <Input id="email" value={form.email} disabled />
            </div>
            <Button onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Profile'}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Address</CardTitle>
            <CardDescription>Change your email address. A confirmation email will be sent to verify the change.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email</Label>
              <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <Button onClick={changeEmail} disabled={savingEmail || !newEmail.trim()}>{savingEmail ? 'Updating...' : 'Change Email'}</Button>
            {emailStatus && <p className="text-sm text-muted-foreground">{emailStatus}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Update your account password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              />
            </div>
            <Button onClick={updatePassword} disabled={savingPassword}>{savingPassword ? 'Updating...' : 'Update Password'}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage your notification preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive email updates about activity and progress.</p>
              </div>
              <Switch checked={preferences.email_updates} onCheckedChange={(checked) => setPreferences({ ...preferences, email_updates: checked })} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <p className="font-medium">Class Reminders</p>
                <p className="text-sm text-muted-foreground">Show reminders in your dashboard.</p>
              </div>
              <Switch checked={preferences.class_reminders} onCheckedChange={(checked) => setPreferences({ ...preferences, class_reminders: checked })} />
            </div>
            <Button onClick={savePreferences} disabled={savingPrefs}>{savingPrefs ? 'Saving...' : 'Save Preferences'}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>View your account details and session information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Account ID</span>
              <span className="font-mono text-xs break-all">{authUser?.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Sign In</span>
              <span>{authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString() : 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="secondary" className="capitalize">{profile?.role?.replace('_', ' ') || 'User'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Session Expires</span>
              <span>{sessionInfo?.expires_at ? new Date(sessionInfo.expires_at * 1000).toLocaleString() : 'Unknown'}</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
