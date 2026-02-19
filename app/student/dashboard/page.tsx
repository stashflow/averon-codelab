'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { LearnAveronCodeLab } from '@/components/learn-averon-codelab'
import {
  defaultUserFeaturePreferences,
  getUserPreferencesStorageKey,
  mergePreferences,
  type UserFeaturePreferences,
} from '@/lib/user-preferences'
import {
  BookOpen,
  Award,
  LogOut,
  ArrowRight,
  Plus,
  Settings,
  Users,
  Bell,
  AlertCircle,
  CheckCircle2,
  Target,
  Star,
  Trophy,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Course {
  id: string
  enrollment_id: string
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

interface ClassroomCodeLookup {
  id: string
  name: string
  code: string
}

type ProgressRow = {
  status: string | null
  score: number | null
}

type SubmissionRow = {
  status: string | null
  score: number | null
}

type AchievementBadge = {
  id: string
  title: string
  description: string
  icon: 'award' | 'check' | 'target' | 'star' | 'trophy'
  earned: boolean
}

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([])
  const [classEnrollments, setClassEnrollments] = useState<ClassroomEnrollment[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([])
  const [submissionRows, setSubmissionRows] = useState<SubmissionRow[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<UserFeaturePreferences>(defaultUserFeaturePreferences)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [leavingClassroomId, setLeavingClassroomId] = useState<string | null>(null)
  const router = useRouter()

  const completedLessons = useMemo(() => progressRows.filter((row) => row.status === 'completed').length, [progressRows])
  const inProgressLessons = useMemo(() => progressRows.filter((row) => row.status === 'in_progress').length, [progressRows])
  const gradedSubmissions = useMemo(() => submissionRows.filter((row) => row.status === 'graded').length, [submissionRows])
  const submittedSubmissions = useMemo(
    () => submissionRows.filter((row) => row.status === 'submitted' || row.status === 'graded').length,
    [submissionRows],
  )
  const averageGrade = useMemo(() => {
    const scores = submissionRows
      .map((row) => row.score)
      .filter((score): score is number => typeof score === 'number')
    if (scores.length === 0) return 0
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  }, [submissionRows])

  const achievementBadges = useMemo<AchievementBadge[]>(() => {
    const badgeTypeSet = new Set((badges || []).map((badge: any) => String(badge.badge_type || '').toLowerCase()))
    const badgeNameSet = new Set((badges || []).map((badge: any) => String(badge.badge_name || '').toLowerCase()))
    const hasExistingBadge = (keys: string[]) => keys.some((key) => badgeTypeSet.has(key) || badgeNameSet.has(key))

    return [
      {
        id: 'first-lesson',
        title: 'First Lesson Complete',
        description: 'Complete your first lesson.',
        icon: 'check',
        earned: completedLessons >= 1 || hasExistingBadge(['first_lesson', 'first lesson complete']),
      },
      {
        id: 'lesson-5',
        title: 'Momentum Builder',
        description: 'Complete 5 lessons.',
        icon: 'target',
        earned: completedLessons >= 5 || hasExistingBadge(['momentum_builder', 'momentum builder']),
      },
      {
        id: 'lesson-15',
        title: 'Unit Finisher',
        description: 'Complete 15 lessons.',
        icon: 'award',
        earned: completedLessons >= 15 || hasExistingBadge(['unit_finisher', 'unit finisher']),
      },
      {
        id: 'first-submit',
        title: 'First Submission',
        description: 'Submit your first assignment.',
        icon: 'star',
        earned: submittedSubmissions >= 1 || hasExistingBadge(['first_submission', 'first submission']),
      },
      {
        id: 'graded-5',
        title: 'Feedback Ready',
        description: 'Receive 5 graded submissions.',
        icon: 'award',
        earned: gradedSubmissions >= 5 || hasExistingBadge(['feedback_ready', 'feedback ready']),
      },
      {
        id: 'high-score',
        title: 'High Performer',
        description: 'Maintain an average grade of 90 or higher.',
        icon: 'trophy',
        earned: (gradedSubmissions >= 3 && averageGrade >= 90) || hasExistingBadge(['high_performer', 'high performer']),
      },
      {
        id: 'class-joiner',
        title: 'Class Collaborator',
        description: 'Join at least one classroom.',
        icon: 'check',
        earned: classEnrollments.length >= 1 || hasExistingBadge(['class_collaborator', 'class collaborator']),
      },
      {
        id: 'deep-practice',
        title: 'Deep Practice',
        description: 'Keep 10+ lessons in progress or completed.',
        icon: 'target',
        earned: completedLessons + inProgressLessons >= 10 || hasExistingBadge(['deep_practice', 'deep practice']),
      },
    ]
  }, [averageGrade, badges, classEnrollments.length, completedLessons, gradedSubmissions, inProgressLessons, submittedSubmissions])

  const earnedBadgeCount = useMemo(() => achievementBadges.filter((badge) => badge.earned).length, [achievementBadges])

  const overallCourseProgress = useMemo(() => {
    const targetLessons = Math.max(10, enrolledCourses.length * 8)
    return Math.min(100, Math.round((completedLessons / targetLessons) * 100))
  }, [completedLessons, enrolledCourses.length])

  const prefsStorageKey = useMemo(() => (profile?.id ? getUserPreferencesStorageKey(profile.id) : ''), [profile])
  const joinDraftKey = useMemo(() => (profile?.id ? `acl:join-code-draft:${profile.id}` : ''), [profile])

  useEffect(() => {
    loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!preferences.keyboard_shortcuts) return
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      if (!el) return false
      const tag = el.tagName
      return el.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      if (event.key.toLowerCase() === 'c') router.push('/courses')
      if (event.key.toLowerCase() === 's') router.push('/settings')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [preferences.keyboard_shortcuts, router])

  useEffect(() => {
    if (!preferences.draft_autosave || !joinDraftKey) return
    const raw = localStorage.getItem(joinDraftKey)
    if (raw) setJoinCode(raw)
  }, [preferences.draft_autosave, joinDraftKey])

  useEffect(() => {
    if (!joinDraftKey) return
    if (!preferences.draft_autosave) {
      localStorage.removeItem(joinDraftKey)
      return
    }
    localStorage.setItem(joinDraftKey, joinCode)
  }, [joinCode, joinDraftKey, preferences.draft_autosave])

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

      const [{ data: profileData }, { data: enrollmentData }, { data: classEnrollmentData }, { data: badgeData }, { data: progressData }, { data: submissionsData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authUser.id).single(),
        supabase.from('course_enrollments').select('id, course_id, courses(*)').eq('student_id', authUser.id).eq('is_active', true),
        supabase
          .from('enrollments')
          .select('id, classroom_id, classrooms(id, name, code, teacher_id)')
          .eq('student_id', authUser.id),
        supabase.from('badges').select('*').eq('student_id', authUser.id).order('earned_at', { ascending: false }).limit(20),
        supabase.from('student_lesson_progress').select('status, score').eq('student_id', authUser.id),
        supabase.from('submissions').select('status, score').eq('student_id', authUser.id),
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

      setEnrolledCourses(
        (enrollmentData || [])
          .map((e: any) => (e.courses ? { ...e.courses, enrollment_id: e.id } : null))
          .filter(Boolean),
      )
      setClassEnrollments((classEnrollmentData as any) || [])
      setBadges(badgeData || [])
      setProgressRows((progressData as ProgressRow[]) || [])
      setSubmissionRows((submissionsData as SubmissionRow[]) || [])

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

      const key = getUserPreferencesStorageKey(authUser.id)
      const rawPrefs = localStorage.getItem(key)
      if (rawPrefs) {
        try {
          setPreferences(mergePreferences(JSON.parse(rawPrefs)))
        } catch {
          setPreferences(defaultUserFeaturePreferences)
        }
      } else {
        setPreferences(defaultUserFeaturePreferences)
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
      const { data, error: classError } = await supabase
        .rpc('lookup_classroom_by_code', { target_code: normalizedCode, require_admin_created: false })
        .single()

      const classroom = (data ?? null) as ClassroomCodeLookup | null

      if (classError || !classroom) {
        setJoinError('Class code not found.')
        return
      }

      const { data: classMeta, error: classMetaError } = await supabase
        .from('classrooms')
        .select('teacher_id, school_id')
        .eq('id', classroom.id)
        .single()

      if (classMetaError) {
        throw classMetaError
      }

      let targetSchoolId: string | null = classMeta?.school_id || null
      if (classMeta?.teacher_id) {
        const { data: teacherProfile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', classMeta.teacher_id)
          .single()
        targetSchoolId = teacherProfile?.school_id || targetSchoolId
      }

      const currentStudentSchoolId = profile?.school_id || null
      if (currentStudentSchoolId && targetSchoolId && currentStudentSchoolId !== targetSchoolId) {
        setJoinError('This class belongs to a different school than your current account school.')
        return
      }

      if (!currentStudentSchoolId && targetSchoolId) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ school_id: targetSchoolId })
          .eq('id', user.id)
          .eq('role', 'student')

        if (profileUpdateError) {
          throw profileUpdateError
        }
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

  async function handleLeaveClass(enrollmentId: string) {
    if (!user) return
    const confirmed = window.confirm('Leave this class? You can rejoin later with the class code.')
    if (!confirmed) return

    setLeavingClassroomId(enrollmentId)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('student_id', user.id)
        .eq('id', enrollmentId)

      if (error) throw error

      await loadDashboardData()
    } catch (err: any) {
      console.error('[v0] leave class error', err)
      alert(err.message || 'Failed to leave class.')
    } finally {
      setLeavingClassroomId(null)
    }
  }

  function setFeaturePreference(key: keyof UserFeaturePreferences, value: boolean) {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  async function saveFeaturePreferences() {
    if (!prefsStorageKey) return
    setSavingPreferences(true)
    localStorage.setItem(prefsStorageKey, JSON.stringify(preferences))
    setSavingPreferences(false)
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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/ACL.png" alt="ACL Logo" width={40} height={40} className="w-10 h-10 logo-theme-filter" />
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-foreground leading-tight">Averon CodeLab</h1>
                <p className="text-xs text-muted-foreground">Student Dashboard</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {profile?.full_name || 'Student'}</h1>
          <p className="text-muted-foreground mt-1">Track your progress, join classes, and keep learning.</p>
        </div>

        {announcements.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-primary/5 border border-primary/20 shadow-sm p-6">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Class Announcements</h3>
              </div>
              <div className="space-y-2">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="flex items-start gap-3 rounded-xl bg-card border border-border p-4">
                    {announcement.priority === 'urgent' && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm leading-relaxed">{announcement.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">- {announcement.teacher?.full_name || 'Teacher'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-5">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Completed Lessons</p>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-4xl font-bold text-foreground">{completedLessons}</p>
              <p className="text-sm text-muted-foreground mt-1">done</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-5">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Courses</p>
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <p className="text-4xl font-bold text-foreground">{enrolledCourses.length}</p>
              <p className="text-sm text-muted-foreground mt-1">active</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-5">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Badges Earned</p>
                <Award className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-4xl font-bold text-foreground">{earnedBadgeCount}</p>
              <p className="text-sm text-muted-foreground mt-1">unlocked</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-5">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Average Grade</p>
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-4xl font-bold text-foreground">{averageGrade}%</p>
              <p className="text-sm text-muted-foreground mt-1">graded work</p>
            </div>
          </div>
        </div>

        {preferences.activity_timeline_widgets && (
          <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">Activity Timeline</h3>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-foreground">
                Joined <span className="text-primary font-medium">{classEnrollments.length}</span> active classroom(s).
              </div>
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-foreground">
                Completed <span className="text-primary font-medium">{completedLessons}</span> lesson(s).
              </div>
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-foreground">
                Submitted <span className="text-primary font-medium">{submittedSubmissions}</span> assignment(s), with <span className="text-primary font-medium">{gradedSubmissions}</span> graded.
              </div>
            </div>
          </div>
        )}

        <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-6">
          <div className="relative z-10 space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Achievement Badges</h3>
              <p className="text-sm text-muted-foreground mt-1">Badges unlock from real completed work and graded performance.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {achievementBadges.map((badge) => {
                const Icon = badge.icon === 'check' ? CheckCircle2 : badge.icon === 'target' ? Target : badge.icon === 'star' ? Star : badge.icon === 'trophy' ? Trophy : Award
                return (
                  <div key={badge.id} className={`rounded-xl border p-4 ${badge.earned ? 'bg-emerald-500/15 border-emerald-500/40' : 'bg-muted/30 border-border'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{badge.title}</p>
                      <Icon className={`w-4 h-4 ${badge.earned ? 'text-emerald-300' : 'text-muted-foreground'}`} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                    <p className={`text-xs mt-2 ${badge.earned ? 'text-emerald-300' : 'text-muted-foreground'}`}>{badge.earned ? 'Earned' : 'Locked'}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-6">
            <div className="relative z-10 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Join Class by Code</h3>
                <p className="text-sm text-muted-foreground mt-1">Enter the classroom code provided by your teacher.</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="join-code">Class Code</Label>
                  <Input id="join-code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={12} />
                </div>
                <Button onClick={joinClassByCode} disabled={joining || !joinCode.trim()} className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  {joining ? 'Joining...' : 'Join Class'}
                </Button>
                {joinError && <p className="text-sm text-red-400">{joinError}</p>}
                {joinSuccess && <p className="text-sm text-emerald-400">{joinSuccess}</p>}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-6">
            <div className="relative z-10 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">My Classes</h3>
                <p className="text-sm text-muted-foreground mt-1">Classes you are currently enrolled in.</p>
              </div>
              <div className="space-y-3">
                {classEnrollments.length === 0 && <p className="text-sm text-muted-foreground">You are not enrolled in any classes yet.</p>}
                {classEnrollments.map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center justify-between rounded-xl bg-muted/20 border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">{enrollment.classrooms?.name || 'Class'}</p>
                      <p className="text-sm text-muted-foreground">Code: <span className="font-mono text-primary">{enrollment.classrooms?.code}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/30"><Users className="w-3 h-3" /> Enrolled</Badge>
                      <Button size="sm" variant="outline" onClick={() => handleLeaveClass(enrollment.id)} disabled={leavingClassroomId === enrollment.id} className="border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200 bg-transparent">
                        {leavingClassroomId === enrollment.id ? 'Leaving...' : 'Leave Class'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-6">
            <div className="relative z-10 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Your Courses</h3>
                <p className="text-sm text-muted-foreground mt-1">Continue or explore courses.</p>
              </div>
              <div className="space-y-3">
                {enrolledCourses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No courses yet.</p>
                ) : (
                  enrolledCourses.map((course) => (
                    <div key={course.id} className="rounded-xl bg-muted/20 border border-border p-4">
                      <p className="font-medium text-foreground">{course.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{course.description}</p>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Link href={`/courses/${course.id}`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            Continue <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
                <div className="pt-2">
                  <Link href="/courses">
                    <Button className="w-full">
                      Browse All Courses
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-6">
            <div className="relative z-10 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Progress Snapshot</h3>
                <p className="text-sm text-muted-foreground mt-1">High-level progress across your active learning.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Overall Learning Progress</span>
                    <span className="font-medium text-foreground">{overallCourseProgress}%</span>
                  </div>
                  <Progress value={overallCourseProgress} className="h-2 bg-muted" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/20 border border-border p-4">
                    <p className="text-xs text-muted-foreground">Lessons Completed</p>
                    <p className="text-3xl font-semibold text-foreground mt-1">{completedLessons}</p>
                  </div>
                  <div className="rounded-xl bg-muted/20 border border-border p-4">
                    <p className="text-xs text-muted-foreground">Assignments Graded</p>
                    <p className="text-3xl font-semibold text-foreground mt-1">{gradedSubmissions}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <LearnAveronCodeLab preferences={preferences} onPreferenceChange={setFeaturePreference} />
          <div className="flex justify-end">
            <Button onClick={saveFeaturePreferences} disabled={savingPreferences}>
              {savingPreferences ? 'Saving...' : 'Save Learn Averon Code Lab Preferences'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
