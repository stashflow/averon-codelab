'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { BookOpen, Trophy, Flame, Award, LogOut, ArrowRight, Plus, Settings, Users, Bell, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Course {
  id: string
  name: string
  description: string
  language: string
  estimated_hours: number
}

interface ClassroomEnrollment {
  id: string
  classroom_id: string
  classrooms?: {
    id: string
    name: string
    code: string
    teacher_id: string
    profiles?: { full_name: string | null; email: string | null } | null
  } | null
}

interface Announcement {
  id: string
  message: string
  priority: string
  created_at: string
  teacher: {
    full_name: string
  }
  classroom_id: string
}

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([])
  const [classEnrollments, setClassEnrollments] = useState<ClassroomEnrollment[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [streak, setStreak] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null)
  const router = useRouter()

  const overallCourseProgress = useMemo(() => {
    if (enrolledCourses.length === 0) return 0
    return Math.min(100, Math.round((badges.length / Math.max(1, enrolledCourses.length * 2)) * 100))
  }, [badges.length, enrolledCourses.length])

  useEffect(() => {
    loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDashboardData() {
    const supabase = createClient()

    try {
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !authUser) {
        router.push('/auth/login')
        return
      }

      setUser(authUser)

      const [{ data: profileData }, { data: enrollmentData }, { data: classEnrollmentData }, { data: streakData }, { data: badgeData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authUser.id).single(),
        supabase.from('course_enrollments').select('course_id, courses(*)').eq('student_id', authUser.id).eq('is_active', true),
        supabase
          .from('enrollments')
          .select('id, classroom_id, classrooms(id, name, code, teacher_id, profiles!classrooms_teacher_id_fkey(full_name, email))')
          .eq('student_id', authUser.id),
        supabase.from('student_streaks').select('*').eq('student_id', authUser.id).single(),
        supabase.from('badges').select('*').eq('student_id', authUser.id).order('earned_at', { ascending: false }).limit(6),
      ])

      setProfile(profileData)
      if (!profileData?.role) {
        router.push('/onboarding/role')
        return
      }
      if (profileData.role !== 'student') {
        router.push('/protected')
        return
      }

      setEnrolledCourses((enrollmentData || []).map((e: any) => e.courses).filter(Boolean))
      setClassEnrollments((classEnrollmentData as any) || [])
      setStreak(streakData || { current_streak: 0, longest_streak: 0 })
      setBadges(badgeData || [])

      // Load announcements for all enrolled classes
      if (classEnrollmentData && classEnrollmentData.length > 0) {
        const classroomIds = classEnrollmentData.map((e: any) => e.classroom_id)
        const { data: announcementsData } = await supabase
          .from('class_announcements')
          .select(`
            id,
            message,
            priority,
            created_at,
            classroom_id,
            teacher:teacher_id(full_name)
          `)
          .in('classroom_id', classroomIds)
          .eq('is_active', true)
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(5)

        setAnnouncements((announcementsData as any) || [])
      }
    } catch (err: any) {
      console.error('[v0] student dashboard load error', err)
    } finally {
      setLoading(false)
    }
  }

  async function joinClassByCode() {
    if (!joinCode.trim() || !user) return
    setJoining(true)
    setJoinError(null)
    setJoinSuccess(null)

    const supabase = createClient()

    try {
      const normalizedCode = joinCode.trim().toUpperCase()
      const { data: classroom, error: classError } = await supabase
        .from('classrooms')
        .select('id, name, code')
        .eq('code', normalizedCode)
        .single()

      if (classError || !classroom) {
        setJoinError('Class code not found.')
        return
      }

      const { error: insertError } = await supabase.from('enrollments').insert({
        classroom_id: classroom.id,
        student_id: user.id,
      })

      if (insertError) {
        if (insertError.message?.toLowerCase().includes('duplicate') || insertError.message?.toLowerCase().includes('unique')) {
          setJoinError('You are already enrolled in this class.')
          return
        }
        throw insertError
      }

      setJoinCode('')
      setJoinSuccess(`Joined ${classroom.name} successfully.`)
      await loadDashboardData()
    } catch (err: any) {
      console.error('[v0] join class error', err)
      setJoinError(err.message || 'Failed to join class.')
    } finally {
      setJoining(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950 flex items-center justify-center">
        <p className="text-slate-300">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950">
      <header className="sticky top-0 z-50 bg-slate-950/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/ACL.png" alt="ACL Logo" width={40} height={40} className="w-10 h-10" />
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-white leading-tight">Averon CodeLab</h1>
                <p className="text-xs text-slate-400">Student Dashboard</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/settings">
                <Button variant="outline" className="gap-2 bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white backdrop-blur-sm">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </Link>
              <Button onClick={handleSignOut} variant="outline" className="gap-2 bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white backdrop-blur-sm">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back, {profile?.full_name || 'Student'}</h1>
          <p className="text-slate-400 mt-1">Track your progress, join classes, and keep learning.</p>
        </div>

        {announcements.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-blue-400/20 shadow-2xl shadow-blue-500/20 p-6">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Class Announcements</h3>
              </div>
              <div className="space-y-2">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="flex items-start gap-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4"
                  >
                    {announcement.priority === 'urgent' && (
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm leading-relaxed">
                        {announcement.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        - {announcement.teacher?.full_name || 'Teacher'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-orange-500/10 p-5">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-300">Current Streak</p>
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-4xl font-bold text-white">{streak?.current_streak || 0}</p>
              <p className="text-sm text-slate-400 mt-1">days</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent" />
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-blue-500/10 p-5">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-300">Courses</p>
                <BookOpen className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-4xl font-bold text-white">{enrolledCourses.length}</p>
              <p className="text-sm text-slate-400 mt-1">active</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-emerald-500/10 p-5">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-300">Badges Earned</p>
                <Award className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-4xl font-bold text-white">{badges.length}</p>
              <p className="text-sm text-slate-400 mt-1">recent</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-yellow-500/10 p-5">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-300">Longest Streak</p>
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-4xl font-bold text-white">{streak?.longest_streak || 0}</p>
              <p className="text-sm text-slate-400 mt-1">days</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
            <div className="relative z-10 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Join Class by Code</h3>
                <p className="text-sm text-slate-400 mt-1">Enter the classroom code provided by your teacher.</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="join-code" className="text-slate-300">Class Code</Label>
                  <Input
                    id="join-code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={12}
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-blue-400/20"
                  />
                </div>
                <Button 
                  onClick={joinClassByCode} 
                  disabled={joining || !joinCode.trim()} 
                  className="w-full gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 border-0"
                >
                  <Plus className="w-4 h-4" />
                  {joining ? 'Joining...' : 'Join Class'}
                </Button>
                {joinError && <p className="text-sm text-red-400">{joinError}</p>}
                {joinSuccess && <p className="text-sm text-emerald-400">{joinSuccess}</p>}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
            <div className="relative z-10 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white">My Classes</h3>
                <p className="text-sm text-slate-400 mt-1">Classes you are currently enrolled in.</p>
              </div>
              <div className="space-y-3">
                {classEnrollments.length === 0 && <p className="text-sm text-slate-400">You are not enrolled in any classes yet.</p>}
                {classEnrollments.map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center justify-between rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 shadow-lg">
                    <div>
                      <p className="font-medium text-white">{enrollment.classrooms?.name || 'Class'}</p>
                      <p className="text-sm text-slate-400">
                        Code: <span className="font-mono text-cyan-400">{enrollment.classrooms?.code}</span>
                      </p>
                    </div>
                    <Badge variant="secondary" className="gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      <Users className="w-3 h-3" /> Enrolled
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
            <div className="relative z-10 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Your Courses</h3>
                <p className="text-sm text-slate-400 mt-1">Continue or explore courses.</p>
              </div>
              <div className="space-y-3">
                {enrolledCourses.length === 0 ? (
                  <p className="text-sm text-slate-400">No courses yet.</p>
                ) : (
                  enrolledCourses.map((course) => (
                    <div key={course.id} className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 shadow-lg">
                      <p className="font-medium text-white">{course.name}</p>
                      <p className="text-sm text-slate-400 line-clamp-2 mt-1">{course.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-slate-500">{course.estimated_hours || 30} hours</p>
                        <Link href={`/courses/${course.id}`}>
                          <Button size="sm" variant="outline" className="gap-1 bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white">
                            Continue <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
                <div className="pt-2">
                  <Link href="/courses">
                    <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 border-0">
                      Browse All Courses
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
            <div className="relative z-10 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Progress Snapshot</h3>
                <p className="text-sm text-slate-400 mt-1">High-level progress across your active learning.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">Overall Learning Progress</span>
                    <span className="font-medium text-white">{overallCourseProgress}%</span>
                  </div>
                  <Progress value={overallCourseProgress} className="h-2 bg-white/10" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 shadow-lg">
                    <p className="text-xs text-slate-400">Classes Joined</p>
                    <p className="text-3xl font-semibold text-white mt-1">{classEnrollments.length}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 shadow-lg">
                    <p className="text-xs text-slate-400">Recent Badges</p>
                    <p className="text-3xl font-semibold text-white mt-1">{badges.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
