'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  ArrowRight,
  Code,
  Users,
  Layers,
  Zap,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Trophy,
  TrendingUp,
  Shield,
  Globe,
  Code2,
  BarChart3,
  Award,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        let profile: { role?: string; school_id?: string | null } | null = null
        const profileWithSchool = await supabase.from('profiles').select('role, school_id').eq('id', authUser.id).single()
        if (profileWithSchool.error && profileWithSchool.error.message?.toLowerCase().includes('school_id')) {
          const profileWithoutSchool = await supabase.from('profiles').select('role').eq('id', authUser.id).single()
          profile = profileWithoutSchool.data ? { ...profileWithoutSchool.data, school_id: null } : null
        } else {
          profile = profileWithSchool.data
        }

        if (profile?.role === 'teacher' && !profile.school_id) {
          router.push('/onboarding/teacher')
        } else if (profile?.role === 'teacher') {
          router.push('/protected/teacher')
        } else {
          router.push('/protected')
        }
      }

      setUser(authUser)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/ACL.png"
                alt="ACL Logo"
                width={48}
                height={48}
                priority
                className="w-12 h-12 logo-theme-filter"
              />
              <span className="hidden sm:block font-bold text-xl bg-gradient-to-r from-foreground via-primary to-primary bg-clip-text text-transparent group-hover:opacity-90 transition-all">
                Averon CodeLab
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/auth/login">
                <Button variant="ghost" className="text-sm font-medium">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-primary/25 font-semibold">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-40 lg:py-48 relative">
          <div className="text-center space-y-10">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-semibold text-cyan-300">Next-Gen Coding Education</span>
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-balance leading-[1.1]">
              <span className="block bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                The complete platform
              </span>
              <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                to teach code.
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed text-balance">
              Empowering educators and students with professional tools for teaching and learning programming.
              Streamline assignments, grading, and progress tracking in one unified platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="text-base px-10 py-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-2xl shadow-cyan-500/25 gap-3 font-semibold rounded-xl"
                >
                  Get Started <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-10 py-6 border-2 border-border hover:border-primary/40 gap-3 bg-background text-foreground hover:bg-accent rounded-xl font-semibold"
                >
                  Explore Features
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 pt-12 text-base text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Built for student success</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Learn at your own pace</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Start coding on day one</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse delay-700" />
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 relative">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border mb-6">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Features</span>
          </div>
          <h2 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
              Everything you need
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional tools designed for educators and learners
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Globe,
              title: 'District Management',
              description: 'Organize schools and districts with hierarchical access control and centralized oversight.',
              gradient: 'from-cyan-500 to-blue-500',
            },
            {
              icon: Users,
              title: 'Smart Classrooms',
              description: 'Virtual classrooms with real-time progress tracking, analytics, and student engagement metrics.',
              gradient: 'from-blue-500 to-indigo-500',
            },
            {
              icon: Code,
              title: 'Live Code Editor',
              description: 'Professional IDE experience with syntax highlighting, auto-complete, and multi-language support.',
              gradient: 'from-indigo-500 to-purple-500',
            },
            {
              icon: Zap,
              title: 'Instant Feedback',
              description: 'Automated test execution with detailed results and suggestions for improvement.',
              gradient: 'from-purple-500 to-pink-500',
            },
            {
              icon: TrendingUp,
              title: 'Advanced Analytics',
              description: 'Comprehensive insights into learning patterns, performance trends, and skill development.',
              gradient: 'from-pink-500 to-rose-500',
            },
            {
              icon: Shield,
              title: 'Secure & Reliable',
              description: 'Enterprise-grade security with role-based permissions and data protection.',
              gradient: 'from-rose-500 to-orange-500',
            },
            {
              icon: BookOpen,
              title: 'Assignment Hub',
              description: 'Rich assignment creation with test cases, starter code, and visibility controls.',
              gradient: 'from-orange-500 to-amber-500',
            },
            {
              icon: Trophy,
              title: 'Smart Grading',
              description: 'Streamlined grading workflows with rubrics, feedback templates, and batch operations.',
              gradient: 'from-amber-500 to-yellow-500',
            },
            {
              icon: Sparkles,
              title: 'Course Library',
              description: 'Pre-built courses for Python, JavaScript, Java, and C++ with progressive difficulty levels.',
              gradient: 'from-yellow-500 to-lime-500',
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card backdrop-blur-sm hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-8 space-y-4">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} shadow-lg shadow-primary/20`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-[15px]">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative overflow-hidden py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { value: '10,000+', label: 'Students Learning' },
              { value: '500+', label: 'Teachers' },
              { value: '50,000+', label: 'Assignments' },
              { value: '98%', label: 'Satisfaction' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center space-y-3 group">
                <div className="text-5xl sm:text-6xl font-bold bg-gradient-to-br from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />

          <div className="relative p-16 sm:p-20 text-center space-y-10">
            <h2 className="text-5xl sm:text-6xl font-bold tracking-tight">
              <span className="block bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
                Ready to transform
              </span>
              <span className="block bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                your classroom?
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Join educators and students worldwide using Averon CodeLab to revolutionize coding education.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="text-base px-10 py-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-2xl shadow-primary/25 gap-3 font-semibold rounded-xl"
                >
                  Start for Free <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/ACL.png" alt="ACL Logo" width={48} height={48} className="w-12 h-12 logo-theme-filter" />
              <span className="font-bold text-lg text-foreground">Averon CodeLab</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Averon CodeLab. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
