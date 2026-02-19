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
import { ThemeToggle } from '@/components/theme-toggle'
import { LearnAveronCodeLab } from '@/components/learn-averon-codelab'
import {
  defaultCustomThemeColors,
  getStoredCustomThemeColors,
  resetStoredCustomThemeColors,
  setStoredCustomThemeColors,
  type CustomThemeColors,
} from '@/lib/color-theme'
import {
  defaultUserFeaturePreferences,
  getUserPreferencesStorageKey,
  mergePreferences,
  type UserFeaturePreferences,
} from '@/lib/user-preferences'
import { CheckCircle2, KeyRound, LogOut, Mail, RotateCcw, Save, Settings2, Shield, UserCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [authUser, setAuthUser] = useState<any>(null)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingThemeColors, setSavingThemeColors] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '' })
  const [newEmail, setNewEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' })
  const [preferences, setPreferences] = useState<UserFeaturePreferences>(defaultUserFeaturePreferences)
  const [customColors, setCustomColors] = useState<CustomThemeColors>(defaultCustomThemeColors)
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const prefsStorageKey = useMemo(() => {
    return profile?.id ? getUserPreferencesStorageKey(profile.id) : ''
  }, [profile])

  const dashboardLink = useMemo(() => {
    if (!profile?.role) return '/protected'
    if (profile.role === 'teacher') return '/protected/teacher'
    if (profile.role === 'full_admin') return '/admin/panel'
    if (profile.role === 'district_admin') return '/district/admin'
    if (profile.role === 'school_admin') return '/school/admin'
    return '/student/dashboard'
  }, [profile])

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
      setCustomColors(getStoredCustomThemeColors())
      setLoading(false)
    }

    load()
  }, [router])

  useEffect(() => {
    if (!prefsStorageKey) return
    const raw = localStorage.getItem(prefsStorageKey)
    if (!raw) return

    try {
      setPreferences(mergePreferences(JSON.parse(raw)))
    } catch {
      setPreferences(defaultUserFeaturePreferences)
    }
  }, [prefsStorageKey])

  function setFeaturePreference(key: keyof UserFeaturePreferences, value: boolean) {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  function setCustomColorValue(key: keyof CustomThemeColors, value: string) {
    setCustomColors((prev) => ({ ...prev, [key]: value }))
  }

  function applyThemeColors() {
    setSavingThemeColors(true)
    const normalized = setStoredCustomThemeColors(customColors)
    setCustomColors(normalized)
    setSavingThemeColors(false)
    setStatusMessage('Custom theme colors applied.')
  }

  function resetThemeColors() {
    setSavingThemeColors(true)
    resetStoredCustomThemeColors()
    setCustomColors(defaultCustomThemeColors)
    setSavingThemeColors(false)
    setStatusMessage('Custom theme colors reset.')
  }

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
    } else {
      setStatusMessage('Profile updated.')
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
      setStatusMessage('Password updated successfully.')
    }

    setSavingPassword(false)
  }

  async function savePreferences() {
    if (!prefsStorageKey) return
    setSavingPrefs(true)
    localStorage.setItem(prefsStorageKey, JSON.stringify(preferences))
    setSavingPrefs(false)
    setStatusMessage('Preferences saved.')
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-primary" /> Settings</h1>
            <p className="text-sm text-muted-foreground">Control your account, security, and classroom experience.</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline">
              <Link href={dashboardLink}>Back to Dashboard</Link>
            </Button>
            <Button onClick={signOut} variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {statusMessage && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-primary text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCircle2 className="w-5 h-5 text-primary" /> Profile</CardTitle>
                <CardDescription>Update your name and theme preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Current Email</Label>
                  <Input id="email" value={form.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme-select">Theme</Label>
                  <select
                    id="theme-select"
                    value={theme || 'dark'}
                    onChange={(e) => setTheme(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <Button onClick={saveProfile} disabled={savingProfile} className="gap-2">
                  <Save className="w-4 h-4" />
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </Button>
              </CardContent>
            </Card>

            {profile?.role === 'student' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-primary" /> Student Theme Colors</CardTitle>
                  <CardDescription>Use CSS HSL values to customize your theme. Example: `337 84% 56%`.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="main-color">Main color (`--primary`)</Label>
                      <Input
                        id="main-color"
                        placeholder="337 84% 56%"
                        value={customColors.primary}
                        onChange={(e) => setCustomColorValue('primary', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accent-color">Accent color (`--accent`)</Label>
                      <Input
                        id="accent-color"
                        placeholder="24 95% 58%"
                        value={customColors.accent}
                        onChange={(e) => setCustomColorValue('accent', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="background-color">Background (`--background`)</Label>
                      <Input
                        id="background-color"
                        placeholder="30 33% 99%"
                        value={customColors.background}
                        onChange={(e) => setCustomColorValue('background', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="foreground-color">Text (`--foreground`)</Label>
                      <Input
                        id="foreground-color"
                        placeholder="345 22% 14%"
                        value={customColors.foreground}
                        onChange={(e) => setCustomColorValue('foreground', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={applyThemeColors} disabled={savingThemeColors} className="gap-2">
                      <Save className="w-4 h-4" />
                      {savingThemeColors ? 'Applying...' : 'Apply Custom Colors'}
                    </Button>
                    <Button onClick={resetThemeColors} variant="outline" disabled={savingThemeColors} className="gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Reset Colors
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> Email Address</CardTitle>
                <CardDescription>Change your email and confirm via inbox.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmail">New Email</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <Button onClick={changeEmail} disabled={savingEmail || !newEmail.trim()}>{savingEmail ? 'Updating...' : 'Change Email'}</Button>
                {emailStatus && <p className="text-sm text-muted-foreground">{emailStatus}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> Security</CardTitle>
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
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Control update and reminder behavior.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                  <div>
                    <p className="text-sm font-medium">Email Updates</p>
                    <p className="text-xs text-muted-foreground">Product and class activity notifications.</p>
                  </div>
                  <Switch checked={preferences.email_updates} onCheckedChange={(checked) => setFeaturePreference('email_updates', checked)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                  <div>
                    <p className="text-sm font-medium">Class Reminders</p>
                    <p className="text-xs text-muted-foreground">Upcoming class and assignment reminders.</p>
                  </div>
                  <Switch checked={preferences.class_reminders} onCheckedChange={(checked) => setFeaturePreference('class_reminders', checked)} />
                </div>
                <Button onClick={savePreferences} disabled={savingPrefs} className="w-full">{savingPrefs ? 'Saving...' : 'Save Preferences'}</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Account Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Role</span>
                  <Badge variant="secondary" className="capitalize">{profile?.role?.replace('_', ' ') || 'User'}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Account ID</span>
                  <span className="font-mono text-xs break-all text-right">{authUser?.id}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Last Sign In</span>
                  <span className="text-right">{authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString() : 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Session Expires</span>
                  <span className="text-right">{sessionInfo?.expires_at ? new Date(sessionInfo.expires_at * 1000).toLocaleString() : 'Unknown'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <LearnAveronCodeLab
          preferences={preferences}
          onPreferenceChange={setFeaturePreference}
        />

        <div className="flex justify-end">
          <Button onClick={savePreferences} disabled={savingPrefs} className="gap-2">
            <Save className="w-4 h-4" />
            {savingPrefs ? 'Saving...' : 'Save Learn Feature Settings'}
          </Button>
        </div>
      </main>
    </div>
  )
}
