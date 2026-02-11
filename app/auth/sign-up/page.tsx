'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
            role,
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
          router.push('/onboarding/teacher')
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950 flex">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-slate-950 items-center justify-center p-12">
        <div className="max-w-md space-y-6">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Start Your Journey
              </span>
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed">
              Join Averon CodeLab and unlock your potential with hands-on coding exercises, instant feedback, and
              expert-designed curriculum.
            </p>
          </div>
          <div className="space-y-3 pt-4">
            {['School-ready platform', 'Role-based access', 'Instant access'].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <span className="text-sm text-slate-400">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <Image src="/ACL.png" alt="ACL Logo" width={48} height={48} className="w-12 h-12 logo-theme-filter" />
              <span className="font-bold text-2xl">Averon CodeLab</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Create Account</h1>
              <p className="text-slate-400 mt-2">Sign up to start learning today</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
            <div className="space-y-5">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium text-slate-300">
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
                    className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-blue-400/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-300">
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
                    className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-blue-400/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-300">
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
                    className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-blue-400/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-slate-300">
                    I am a...
                  </Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                    className="w-full h-11 px-3 border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:border-blue-400/50 focus:ring-blue-400/20"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      disabled={loading}
                      className="mt-1"
                    />
                    <label htmlFor="terms" className="text-sm text-slate-300 leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <Link href="/terms" target="_blank" className="text-blue-400 hover:underline font-medium">
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
                      className="mt-1"
                    />
                    <label htmlFor="privacy" className="text-sm text-slate-300 leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <Link href="/privacy" target="_blank" className="text-blue-400 hover:underline font-medium">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/40 text-red-300 p-3 rounded-lg text-sm backdrop-blur-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 border-0"
                  disabled={loading || !acceptedTerms || !acceptedPrivacy}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-950 px-2 text-slate-400">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignUp('google')}
                  disabled={loading}
                  className="w-full h-11 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
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

          <p className="text-sm text-center text-slate-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
