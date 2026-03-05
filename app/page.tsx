'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { releasePlan } from '@/lib/version-changelog'
import {
  ArrowRight,
  Code2,
  Users,
  Zap,
  BarChart3,
  Shield,
  BookOpen,
  Trophy,
  CheckCircle,
  Terminal,
  GitBranch,
  Layers,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const FEATURES = [
  {
    icon: Terminal,
    title: 'Live Code Editor',
    description: 'Professional IDE with syntax highlighting, auto-complete, and multi-language support built for classrooms.',
  },
  {
    icon: Zap,
    title: 'Instant Feedback',
    description: 'Automated test execution gives students detailed results and improvement suggestions in real time.',
  },
  {
    icon: Users,
    title: 'Smart Classrooms',
    description: 'Real-time student presence, intervention flags, progress heatmaps, and assignment queues in one view.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Comprehensive insights into learning patterns, performance trends, and skill development over time.',
  },
  {
    icon: BookOpen,
    title: 'Assignment Hub',
    description: 'Rich assignment creation with test cases, starter code scaffolds, and granular visibility controls.',
  },
  {
    icon: GitBranch,
    title: 'District Management',
    description: 'Hierarchical access control across schools and districts with centralized oversight.',
  },
]

const STATS = [
  { value: '10k+', label: 'Active Students' },
  { value: '500+', label: 'Teachers' },
  { value: '50k+', label: 'Assignments Run' },
  { value: '98%', label: 'Satisfaction Rate' },
]

const TOOLKIT = [
  'Live Student Presence',
  'Assignment Queue',
  'Intervention Flags',
  'Progress Heatmap',
  'Quick Messaging',
  'Teacher Notes',
]

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

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
        <div className="w-10 h-10 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/ACL.png"
                alt="Averon CodeLab"
                width={32}
                height={32}
                priority
                className="w-8 h-8 logo-theme-filter"
              />
              <span className="font-semibold text-base text-foreground tracking-tight">
                Averon CodeLab
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#platform" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Platform
              </Link>
              <Link href="#stats" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Results
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="text-sm font-medium">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button size="sm" className="text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 px-4">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 min-h-[calc(100vh-56px)]">

            {/* Left: headline */}
            <div className="flex flex-col justify-center py-20 lg:py-0 lg:border-r border-border pr-0 lg:pr-16">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-primary uppercase tracking-widest">
                  <span className="w-4 h-px bg-primary" />
                  For Schools &amp; Districts
                </div>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-balance text-foreground">
                  Where teachers
                  <br />
                  teach code.
                  <br />
                  <span className="text-primary">Seriously.</span>
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                  Averon CodeLab gives educators a real command center — live editor, classroom intelligence, automated grading, and district-level control.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <Link href="/auth/sign-up">
                    <Button size="lg" className="font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6">
                      Start for Free <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button size="lg" variant="outline" className="font-semibold px-6 border-border text-foreground">
                      See the Platform
                    </Button>
                  </Link>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-4">
                  {['No setup cost', 'Works on day one', 'Built for K-12'].map((item) => (
                    <span key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: code terminal mockup */}
            <div className="hidden lg:flex items-center justify-center pl-16">
              <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xl">
                  {/* Terminal header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-border" />
                      <div className="w-3 h-3 rounded-full bg-border" />
                      <div className="w-3 h-3 rounded-full bg-border" />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground ml-2">solution.py</span>
                    <span className="ml-auto text-xs font-mono text-primary">● passing</span>
                  </div>
                  {/* Code */}
                  <div className="p-5 font-mono text-sm leading-7">
                    <div className="flex gap-4">
                      <div className="text-muted-foreground/40 select-none text-right w-4 shrink-0">
                        {[1,2,3,4,5,6,7,8,9,10].map(n => <div key={n}>{n}</div>)}
                      </div>
                      <div className="text-foreground/80">
                        <div><span className="text-primary">def</span> <span className="text-accent">fibonacci</span>(n):</div>
                        <div className="pl-4"><span className="text-muted-foreground"># Base cases</span></div>
                        <div className="pl-4"><span className="text-primary">if</span> n {'<='} 1:</div>
                        <div className="pl-8"><span className="text-primary">return</span> n</div>
                        <div className="pl-4"><span className="text-primary">return</span> (</div>
                        <div className="pl-8">fibonacci(n-1)</div>
                        <div className="pl-8">+ fibonacci(n-2)</div>
                        <div className="pl-4">)</div>
                        <div>&nbsp;</div>
                        <div><span className="text-muted-foreground">print</span>(fibonacci(10))</div>
                      </div>
                    </div>
                  </div>
                  {/* Test results */}
                  <div className="px-5 pb-5 space-y-2">
                    <div className="h-px bg-border mb-3" />
                    {[
                      { test: 'fibonacci(0) == 0', pass: true },
                      { test: 'fibonacci(5) == 5', pass: true },
                      { test: 'fibonacci(10) == 55', pass: true },
                    ].map((t) => (
                      <div key={t.test} className="flex items-center gap-2 text-xs font-mono">
                        <span className={t.pass ? 'text-primary' : 'text-destructive'}>{t.pass ? '✓' : '✗'}</span>
                        <span className="text-muted-foreground">{t.test}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-xs font-mono pt-1">
                      <span className="text-primary font-semibold">3/3 tests passed</span>
                      <span className="text-muted-foreground ml-auto">14ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section id="stats" className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border">
            {STATS.map((stat) => (
              <div key={stat.label} className="px-8 py-10 text-center">
                <div className="text-4xl font-bold text-foreground tracking-tight">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
          <div className="flex items-end justify-between mb-16 gap-8 flex-wrap">
            <div>
              <div className="text-xs font-mono font-semibold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-px bg-primary" />
                Platform Features
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground text-balance">
                Everything in one place.
                <br />
                <span className="text-muted-foreground font-normal">Nothing left out.</span>
              </h2>
            </div>
            <Link href="/auth/sign-up">
              <Button variant="outline" className="border-border text-foreground font-semibold gap-2 shrink-0">
                Explore all features <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 border border-border rounded-2xl overflow-hidden">
            {FEATURES.map((feature, idx) => (
              <div
                key={feature.title}
                className={`p-8 space-y-4 border-border ${
                  idx < FEATURES.length - (FEATURES.length % 3 === 0 ? 3 : FEATURES.length % 3) ? 'border-b' : ''
                } ${idx % 3 !== 2 ? 'lg:border-r' : ''} ${idx % 2 !== 1 ? 'sm:border-r lg:border-r-0' : 'sm:border-r-0'} ${
                  idx % 3 !== 2 ? 'lg:border-r' : ''
                } hover:bg-muted/30 transition-colors`}
              >
                <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center bg-background">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform deep-dive — split layout */}
      <section id="platform" className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">

            {/* Left */}
            <div className="py-20 lg:pr-16 space-y-10">
              <div>
                <div className="text-xs font-mono font-semibold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-4 h-px bg-primary" />
                  Smart Classroom
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-foreground text-balance">
                  See every student,
                  <br />
                  in real time.
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  The classroom dashboard surfaces everything a teacher needs — who is active, who is stuck, what needs grading, and where to intervene — without having to dig for it.
                </p>
              </div>
              <div className="space-y-3">
                {TOOLKIT.map((item) => (
                  <div key={item} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right */}
            <div className="py-20 lg:pl-16 space-y-10">
              <div>
                <div className="text-xs font-mono font-semibold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-4 h-px bg-primary" />
                  For Districts
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-foreground text-balance">
                  Secure, scalable,
                  <br />
                  district-ready.
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Built with enterprise-grade access control, role-based permissions, and the data standards K-12 administrators require.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, title: 'Role-Based Access', desc: 'District, school, teacher, and student roles with scoped permissions.' },
                  { icon: Layers, title: 'Multi-School Support', desc: 'Manage multiple campuses under a single district account.' },
                  { icon: Trophy, title: 'Smart Grading', desc: 'Rubrics, feedback templates, and batch grading workflows.' },
                  { icon: Code2, title: '4+ Languages', desc: 'Python, JavaScript, Java, and C++ with more coming.' },
                ].map((item) => (
                  <div key={item.title} className="p-5 rounded-xl border border-border bg-card space-y-3 hover:border-primary/40 transition-colors">
                    <item.icon className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
          <div className="max-w-3xl">
            <div className="text-xs font-mono font-semibold text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-4 h-px bg-primary" />
              Get Started Today
            </div>
            <h2 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground text-balance leading-[1.05]">
              Your classroom.
              <br />
              Your code.
              <br />
              <span className="text-primary">Your results.</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Join educators and students who use Averon CodeLab every day. No procurement delays, no per-seat surprises — just a platform that works.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-10">
              <Link href="/auth/sign-up">
                <Button size="lg" className="font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8">
                  Create a Free Account <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="font-semibold px-8 border-border text-foreground">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Image src="/ACL.png" alt="Averon CodeLab" width={28} height={28} className="w-7 h-7 logo-theme-filter" />
              <span className="font-semibold text-sm text-foreground">Averon CodeLab</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Averon CodeLab
              </p>
              <Link href="/version">
                <Button variant="outline" size="sm" className="text-xs font-semibold h-7 px-2.5">
                  {releasePlan.currentVersion}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
