'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Mail } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (resetError) throw resetError

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending reset email')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <Link href="/auth/login" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Check Your Email</h2>
                <p className="text-white/60">
                  We've sent a password reset link to <span className="text-cyan-400 font-medium">{email}</span>
                </p>
              </div>
              <p className="text-sm text-white/50">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Button
                onClick={() => setSuccess(false)}
                variant="outline"
                className="w-full border-white/10 text-white/80 hover:bg-white/5"
              >
                Try Another Email
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <Link href="/auth/login" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Image src="/ACL.png" alt="ACL Logo" width={48} height={48} className="w-12 h-12 logo-theme-filter" />
            <span className="font-bold text-2xl text-white">Averon CodeLab</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Reset Password</h1>
            <p className="text-white/60 mt-2">Enter your email and we'll send you a reset link</p>
          </div>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-white">
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
                  className="h-11 bg-black border-white/10 text-white"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
