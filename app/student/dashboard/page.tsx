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
import { BookOpen, Trophy, Flame, Award, LogOut, ArrowRight, Plus, Settings, Users } from 'lucide-react'

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

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([])
  const [classEnrollments, setClassEnrollments] = useState<ClassroomEnrollment[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [streak, setStreak] = useState<any>(null)
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/ACL.png" alt="ACL Logo" width={40} height={40} className="w-10 h-10" />
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-foreground leading-tight">Averon CodeLab</h1>
                <p className="text-xs text-muted-foreground">Student Dashboard</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/settings">
                <Button variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </Link>
              <Button onClick={handleSignOut} variant="outline" className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.full_name || 'Student'}</h1>
          <p className="text-muted-foreground mt-1">Track your progress, join classes, and keep learning.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{streak?.current_streak || 0}</p>
              <p className="text-sm text-muted-foreground">days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Courses</CardTitle>
              <BookOpen className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{enrolledCourses.length}</p>
              <p className="text-sm text-muted-foreground">active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Badges Earned</CardTitle>
              <Award className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{badges.length}</p>
              <p className="text-sm text-muted-foreground">recent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Longest Streak</CardTitle>
              <Trophy className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{streak?.longest_streak || 0}</p>
              <p className="text-sm text-muted-foreground">days</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Join Class by Code</CardTitle>
              <CardDescription>Enter the classroom code provided by your teacher.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="join-code">Class Code</Label>
                <Input
                  id="join-code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={12}
                />
              </div>
              <Button onClick={joinClassByCode} disabled={joining || !joinCode.trim()} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                {joining ? 'Joining...' : 'Join Class'}
              </Button>
              {joinError && <p className="text-sm text-destructive">{joinError}</p>}
              {joinSuccess && <p className="text-sm text-green-600">{joinSuccess}</p>}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>My Classes</CardTitle>
              <CardDescription>Classes you are currently enrolled in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {classEnrollments.length === 0 && <p className="text-sm text-muted-foreground">You are not enrolled in any classes yet.</p>}
              {classEnrollments.map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="font-medium">{enrollment.classrooms?.name || 'Class'}</p>
                    <p className="text-sm text-muted-foreground">
                      Code: <span className="font-mono">{enrollment.classrooms?.code}</span>
                    </p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="w-3 h-3" /> Enrolled
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Courses</CardTitle>
              <CardDescription>Continue or explore courses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrolledCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No courses yet.</p>
              ) : (
                enrolledCourses.map((course) => (
                  <div key={course.id} className="border rounded-md p-3">
                    <p className="font-medium">{course.name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{course.estimated_hours || 30} hours</p>
                      <Link href={`/courses/${course.id}`}>
                        <Button size="sm" variant="outline" className="gap-1">
                          Continue <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
              <div className="pt-1">
                <Link href="/courses">
                  <Button className="w-full">Browse All Courses</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress Snapshot</CardTitle>
              <CardDescription>High-level progress across your active learning.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Overall Learning Progress</span>
                  <span className="font-medium">{overallCourseProgress}%</span>
                </div>
                <Progress value={overallCourseProgress} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Classes Joined</p>
                  <p className="text-2xl font-semibold">{classEnrollments.length}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Recent Badges</p>
                  <p className="text-2xl font-semibold">{badges.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
