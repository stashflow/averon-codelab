'use client'

import React from "react"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const dynamic = 'force-dynamic'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmNotice, setShowConfirmNotice] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    if (query.get('confirm') === 'email') {
      setShowConfirmNotice(true)
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) throw loginError

      router.push('/protected')
      router.refresh()
    } catch (err: any) {
      const message = err.message || 'An error occurred during login'
      if (message.toLowerCase().includes('email not confirmed')) {
        setShowConfirmNotice(true)
        setError('Please confirm your email first, then sign in.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuthLogin(provider: 'google') {
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message || `An error occurred during ${provider} sign in`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-rose-50/40 to-orange-50/60 text-slate-900 flex warm-aurora">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <Image src="/ACL.png" alt="ACL Logo" width={48} height={48} className="w-12 h-12 logo-theme-filter" />
              <span className="font-bold text-2xl">Averon CodeLab</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
              <p className="text-slate-600 mt-2">Sign in to continue your learning journey</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl p-6 backdrop-blur-sm">
            <div className="space-y-5">
              {showConfirmNotice && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex items-start justify-between gap-3">
                  <p>Before signing in, confirm your email from the verification message we sent you.</p>
                  <button
                    type="button"
                    onClick={() => setShowConfirmNotice(false)}
                    className="text-amber-700 hover:text-amber-900 text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">
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
                    className="h-11 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:ring-pink-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                      Password
                    </Label>
                    <Link href="/auth/forgot-password" className="text-xs text-pink-700 hover:text-orange-700 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:ring-pink-500/20"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-500 hover:from-fuchsia-600 hover:via-pink-600 hover:to-orange-600 text-white shadow-lg shadow-pink-500/25 border-0"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={loading}
                  className="w-full h-11 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
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

          <p className="text-sm text-center text-slate-600">
            Don't have an account?{' '}
            <Link href="/auth/sign-up" className="text-pink-700 hover:text-orange-700 hover:underline font-semibold">
              Create account
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-white via-rose-50/40 to-orange-50/70 items-center justify-center p-12 border-l border-slate-200/70">
        <div className="max-w-md space-y-6">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                Code. Learn. Excel.
              </span>
            </h2>
            <p className="text-lg text-slate-700 leading-relaxed">
              Join thousands of students and teachers using Averon CodeLab to master programming skills and achieve
              their goals.
            </p>
          </div>
          <div className="space-y-3 pt-4">
            {['Interactive coding environment', 'Real-time feedback', 'Track your progress'].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-pink-600" />
                </div>
                <span className="text-sm text-slate-600">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
