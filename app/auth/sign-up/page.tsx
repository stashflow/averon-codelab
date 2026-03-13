'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export const dynamic = 'force-dynamic'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate legal acceptance
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('You must accept both the Terms of Service and Privacy Policy to create an account')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
          data: {
            full_name: fullName,
            role: 'student',
          },
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // Store legal acceptance
        const { error: acceptanceError } = await supabase.from('legal_acceptances').insert({
          user_id: data.user.id,
          terms_version: 'v1.0',
          privacy_version: 'v1.0',
        })

        if (acceptanceError) {
          console.error('[v0] Error storing legal acceptance:', acceptanceError)
        }

        // Redirect teachers to onboarding, students to success page
        if (role === 'teacher') {
          router.push('/onboarding/teacher?intent=teacher')
        } else {
          router.push('/auth/sign-up-success')
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuthSignUp(provider: 'google') {
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message || `An error occurred during ${provider} sign up`)
      setLoading(false)
    }
  }

  return (
    <AppShell className="flex bg-background text-foreground">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <Image src="/ACL.png" alt="ACL Logo" width={48} height={48} className="w-12 h-12 logo-theme-filter" />
              <span className="font-bold text-2xl">Averon CodeLab</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Create Account</h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Build your workspace and start learning in minutes.
              </p>
            </div>
          </div>

          <div className="site-panel relative overflow-hidden p-6">
            <div className="space-y-5">
              <div className="rounded-lg border border-primary/20 bg-primary/8 p-4">
                <p className="text-sm font-medium text-foreground">Your account includes</p>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="rounded-md border border-border/60 bg-background/55 px-3 py-2">Guided coding lessons</div>
                  <div className="rounded-md border border-border/60 bg-background/55 px-3 py-2">Saved classroom progress</div>
                  <div className="rounded-md border border-border/60 bg-background/55 px-3 py-2">Instant assignment access</div>
                  <div className="rounded-md border border-border/60 bg-background/55 px-3 py-2">Teacher onboarding tools</div>
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    I am a...
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        value: 'student',
                        label: 'Student',
                        description: 'Join classes, complete lessons, and code in your workspace.',
                      },
                      {
                        value: 'teacher',
                        label: 'Teacher',
                        description: 'Create classes, assign work, and guide student progress.',
                      },
                    ].map((option) => {
                      const isSelected = role === option.value

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setRole(option.value)}
                          disabled={loading}
                          className={`rounded-xl border px-4 py-3 text-left transition ${
                            isSelected
                              ? 'border-primary/45 bg-primary/10 shadow-[0_0_0_1px_rgba(59,130,246,0.12)]'
                              : 'border-border/70 bg-background/70 hover:border-primary/25 hover:bg-background'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-foreground">{option.label}</span>
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                isSelected ? 'bg-primary' : 'bg-border'
                              }`}
                            />
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{option.description}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border/70 bg-background/55 p-4">
                  <p className="text-sm font-medium text-foreground">Before you continue</p>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      disabled={loading}
                      className="mt-1 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      I agree to the{' '}
                      <Link href="/terms" target="_blank" className="text-primary hover:text-foreground hover:underline font-medium">
                        Terms of Service
                      </Link>
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="privacy"
                      checked={acceptedPrivacy}
                      onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
                      disabled={loading}
                      className="mt-1 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label htmlFor="privacy" className="cursor-pointer text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      I agree to the{' '}
                      <Link href="/privacy" target="_blank" className="text-primary hover:text-foreground hover:underline font-medium">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading || !acceptedTerms || !acceptedPrivacy}
                >
                  {loading ? 'Creating account...' : role === 'teacher' ? 'Continue as Teacher' : 'Create Account'}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignUp('google')}
                  disabled={loading}
                  className="w-full h-11"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
              </form>
            </div>
          </div>

          <p className="text-sm text-center text-slate-600 dark:text-slate-300">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:text-foreground hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center p-12 border-l border-border/70 bg-background/30">
        <div className="max-w-md space-y-6">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">
              <span className="text-gradient-premium">
                Start Strong From Day One.
              </span>
            </h2>
            <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">
              Sign up with the same polished workflow students and teachers use every day, then move straight into
              classes, assignments, and guided coding.
            </p>
          </div>
          <div className="space-y-3 pt-4">
            {[
              'Professional classroom-ready experience',
              'Fast onboarding for students and teachers',
              'Progress, coding, and assignments in one place',
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
