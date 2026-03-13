'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LoadingScreen } from '@/components/loading-screen'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { LearnAveronCodeLab } from '@/components/learn-averon-codelab'
import {
  defaultUserFeaturePreferences,
  getUserPreferencesStorageKey,
  mergePreferences,
  type UserFeaturePreferences,
} from '@/lib/user-preferences'
import { getClientAuthContext } from '@/lib/auth/client-auth'
import { Plus, LogOut, BookOpen, Settings, Users, GraduationCap, ClipboardCheck, Clock3, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

type TeacherAssignment = {
  id: string
  title: string
  classroom_id: string | null
  created_at?: string | null
}

type TeacherQueueItem = {
  id: string
  assignment_id: string
  student_name: string
  classroom_name: string
  assignment_title: string
  status: string
  submitted_at: string | null
  created_at: string | null
  score: number | null
}

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [showNewClass, setShowNewClass] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newClassDesc, setNewClassDesc] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null)
  const [assignmentRows, setAssignmentRows] = useState<TeacherAssignment[]>([])
  const [gradingQueue, setGradingQueue] = useState<TeacherQueueItem[]>([])
  const [preferences, setPreferences] = useState<UserFeaturePreferences>(defaultUserFeaturePreferences)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [classroomSearch, setClassroomSearch] = useState('')
  const [classroomSort, setClassroomSort] = useState<'newest' | 'name'>('newest')
  const router = useRouter()

  const studentsByClass = useMemo(() => {
    const map: Record<string, number> = {}
    enrollments.forEach((e: any) => {
      map[e.classroom_id] = (map[e.classroom_id] || 0) + 1
    })
    return map
  }, [enrollments])

  const totalStudents = useMemo(() => Object.values(studentsByClass).reduce((sum, c) => sum + c, 0), [studentsByClass])
  const submissionsReadyToGrade = useMemo(
    () => gradingQueue.filter((item) => item.status === 'submitted').length,
    [gradingQueue],
  )
  const activeDraftSubmissions = useMemo(
    () => gradingQueue.filter((item) => item.status === 'pending').length,
    [gradingQueue],
  )
  const gradedSubmissionCount = useMemo(
    () => gradingQueue.filter((item) => item.status === 'graded').length,
    [gradingQueue],
  )
  const averageGradedScore = useMemo(() => {
    const scores = gradingQueue
      .map((item) => item.score)
      .filter((score): score is number => typeof score === 'number')
    if (scores.length === 0) return 0
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  }, [gradingQueue])
  const recentQueueItems = useMemo(
    () =>
      gradingQueue
        .filter((item) => item.status === 'submitted' || item.status === 'pending')
        .sort((a, b) => {
          const left = new Date(a.submitted_at || a.created_at || 0).getTime()
          const right = new Date(b.submitted_at || b.created_at || 0).getTime()
          return right - left
        })
        .slice(0, 6),
    [gradingQueue],
  )
  const prefsStorageKey = useMemo(() => (profile?.id ? getUserPreferencesStorageKey(profile.id) : ''), [profile])
  const classDraftKey = useMemo(() => (profile?.id ? `acl:teacher-class-draft:${profile.id}` : ''), [profile])
  const classViewKey = useMemo(() => (profile?.id ? `acl:teacher-class-view:${profile.id}` : ''), [profile])

  const displayedClassrooms = useMemo(() => {
    const filtered = classrooms.filter((c) => c.name.toLowerCase().includes(classroomSearch.toLowerCase()))
    if (classroomSort === 'name') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
    }
    return filtered
  }, [classroomSearch, classroomSort, classrooms])

  useEffect(() => {
    loadData()
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
      if (event.key.toLowerCase() === 'n') setShowNewClass(true)
      if (event.key.toLowerCase() === 's') router.push('/settings')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [preferences.keyboard_shortcuts, router])

  useEffect(() => {
    if (!classDraftKey || !preferences.draft_autosave) return
    const raw = localStorage.getItem(classDraftKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      setNewClassName(parsed.name || '')
      setNewClassDesc(parsed.description || '')
    } catch {
      // ignore invalid data
    }
  }, [classDraftKey, preferences.draft_autosave])

  useEffect(() => {
    if (!classDraftKey) return
    if (!preferences.draft_autosave) {
      localStorage.removeItem(classDraftKey)
      return
    }
    localStorage.setItem(classDraftKey, JSON.stringify({ name: newClassName, description: newClassDesc }))
  }, [classDraftKey, preferences.draft_autosave, newClassName, newClassDesc])

  useEffect(() => {
    if (!classViewKey) return
    if (!preferences.saved_filters_and_sort) {
      localStorage.removeItem(classViewKey)
      return
    }
    localStorage.setItem(classViewKey, JSON.stringify({ classroomSearch, classroomSort }))
  }, [classViewKey, preferences.saved_filters_and_sort, classroomSearch, classroomSort])

  async function loadData() {
    try {
      const {
        supabase,
        user: authUser,
        profile: profileData,
        missingSchoolIdColumn,
      } = await getClientAuthContext<{ id?: string; role?: string | null; school_id?: string | null }>({
        profileSelect: 'id, role, school_id',
      })

      if (!authUser) {
        router.push('/auth/login')
        return
      }

      setUser(authUser)
      setProfile(profileData)

      if (profileData?.role !== 'teacher') {
        router.push('/protected')
        return
      }

      if (!missingSchoolIdColumn && !profileData?.school_id) {
        router.push('/onboarding/teacher')
        return
      }

      const { data: classData, error: classError } = await supabase
        .from('classrooms')
        .select('id, name, description, code, created_at')
        .eq('teacher_id', authUser.id)
        .order('created_at', { ascending: false })

      if (classError) throw classError
      setClassrooms(classData || [])

      if (classData && classData.length > 0) {
        const classIds = classData.map((c) => c.id)
        const [{ data: enrollmentData }, { data: assignmentData }, { data: submissionData }] = await Promise.all([
          supabase.from('enrollments').select('id, classroom_id').in('classroom_id', classIds),
          supabase.from('assignments').select('id, title, classroom_id, created_at').in('classroom_id', classIds),
          supabase
            .from('submissions')
            .select('id, assignment_id, status, submitted_at, created_at, score, profiles(full_name)')
            .order('submitted_at', { ascending: false }),
        ])
        setEnrollments(enrollmentData || [])
        const nextAssignments = (assignmentData as TeacherAssignment[] | null) || []
        setAssignmentRows(nextAssignments)

        const assignmentById = Object.fromEntries(nextAssignments.map((assignment) => [assignment.id, assignment]))
        const classroomById = Object.fromEntries((classData || []).map((classroom) => [classroom.id, classroom.name]))
        const nextQueue = ((submissionData as any[]) || [])
          .filter((row) => assignmentById[row.assignment_id])
          .map((row) => {
            const assignment = assignmentById[row.assignment_id]
            return {
              id: row.id,
              assignment_id: row.assignment_id,
              student_name: row.profiles?.full_name || 'Student',
              classroom_name: assignment?.classroom_id ? classroomById[assignment.classroom_id] || 'Classroom' : 'Classroom',
              assignment_title: assignment?.title || 'Assignment',
              status: String(row.status || 'pending'),
              submitted_at: row.submitted_at || null,
              created_at: row.created_at || null,
              score: typeof row.score === 'number' ? row.score : null,
            }
          })
        setGradingQueue(nextQueue)
      } else {
        setEnrollments([])
        setAssignmentRows([])
        setGradingQueue([])
      }

      const key = getUserPreferencesStorageKey(authUser.id)
      const rawPrefs = localStorage.getItem(key)
      if (rawPrefs) {
        try {
          const mergedPrefs = mergePreferences(JSON.parse(rawPrefs))
          setPreferences(mergedPrefs)
          if (mergedPrefs.saved_filters_and_sort) {
            const rawView = localStorage.getItem(`acl:teacher-class-view:${authUser.id}`)
            if (rawView) {
              try {
                const parsedView = JSON.parse(rawView)
                setClassroomSearch(parsedView.classroomSearch || '')
                setClassroomSort(parsedView.classroomSort === 'name' ? 'name' : 'newest')
              } catch {
                // ignore invalid data
              }
            }
          }
        } catch {
          setPreferences(defaultUserFeaturePreferences)
        }
      }
    } catch (err: any) {
      console.error('[v0] teacher dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateClass() {
    if (!newClassName.trim() || !profile?.school_id || !user) return

    setCreating(true)

    const supabase = createClient()
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()

      const { error } = await supabase.from('classrooms').insert({
        teacher_id: user.id,
        school_id: profile.school_id,
        name: newClassName,
        description: newClassDesc,
        code,
      })

      if (error) throw error

      setNewClassName('')
      setNewClassDesc('')
      setShowNewClass(false)
      await loadData()
    } catch (err: any) {
      console.error('Error creating class:', err)
      alert(err.message || 'Failed to create class')
    } finally {
      setCreating(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  async function handleDeleteClass(classroomId: string, classroomName: string) {
    const confirmed = window.confirm(
      `Delete class \"${classroomName}\"? This will remove enrollments, student course access from this class, assignments, and related records.`,
    )
    if (!confirmed) return

    setDeletingClassId(classroomId)
    const supabase = createClient()
    try {
      const { error } = await supabase.from('classrooms').delete().eq('id', classroomId)
      if (error) throw error
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete class')
    } finally {
      setDeletingClassId(null)
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
    return <LoadingScreen message="Loading..." />
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between h-16">
          <Link href="/protected/teacher" className="flex items-center gap-3">
            <Image src="/ACL.png" alt="ACL Logo" width={40} height={40} className="w-10 h-10 logo-theme-filter" />
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-foreground leading-tight">ACL Teacher</h1>
              <p className="text-xs text-foreground/80 font-medium">Dashboard</p>
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
            <Link href="/teacher/join">
              <Button variant="outline" className="gap-2 text-sm">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Join Class</span>
              </Button>
            </Link>
            <Button onClick={handleSignOut} variant="outline" className="gap-2 text-sm">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Your Classes</h2>
            <p className="text-sm text-foreground/80">Manage classrooms, enrollment, and student access.</p>
            {preferences.keyboard_shortcuts && (
              <p className="text-xs text-primary mt-1">Keyboard shortcuts: press <span className="font-mono">N</span> for new class, <span className="font-mono">S</span> for settings.</p>
            )}
          </div>
          <Button onClick={() => setShowNewClass(!showNewClass)} className="gap-2">
            <Plus className="w-4 h-4" />
            {showNewClass ? 'Cancel' : 'New Class'}
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Filter classes by name..."
              value={classroomSearch}
              onChange={(e) => setClassroomSearch(e.target.value)}
            />
            <select
              value={classroomSort}
              onChange={(e) => setClassroomSort((e.target.value === 'name' ? 'name' : 'newest') as 'newest' | 'name')}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="newest">Sort: Newest</option>
              <option value="name">Sort: Name</option>
            </select>
            <Button variant="outline" onClick={() => { setClassroomSearch(''); setClassroomSort('newest') }}>
              Reset View
            </Button>
          </CardContent>
        </Card>

        {preferences.quick_actions_bar && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button onClick={() => setShowNewClass(true)} variant="outline" className="justify-start gap-2">
              <Plus className="w-4 h-4 text-primary" /> Create Classroom
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/teacher/join">
                <BookOpen className="w-4 h-4 text-primary" /> Join Existing Class
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/settings">
                <Settings className="w-4 h-4 text-primary" /> Teacher Preferences
              </Link>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Classes</CardTitle>
              <GraduationCap className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{classrooms.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Students</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalStudents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Ready To Grade</CardTitle>
              <ClipboardCheck className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{submissionsReadyToGrade}</p>
              <p className="text-sm text-foreground/80 mt-1">submitted reviews waiting on teacher feedback</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Draft Activity</CardTitle>
              <Clock3 className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeDraftSubmissions}</p>
              <p className="text-sm text-foreground/80 mt-1">students currently working in saved drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Graded Average</CardTitle>
              <Sparkles className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{averageGradedScore}%</p>
              <p className="text-sm text-foreground/80 mt-1">
                {gradedSubmissionCount} graded submission{gradedSubmissionCount === 1 ? '' : 's'} across {assignmentRows.length} assignment{assignmentRows.length === 1 ? '' : 's'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Grading Queue</CardTitle>
              <CardDescription>Latest student work that needs review or is still in progress.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentQueueItems.length === 0 ? (
                <p className="text-sm text-foreground/80">No submission activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentQueueItems.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.student_name}</p>
                          <Badge variant={item.status === 'submitted' ? 'default' : 'secondary'}>
                            {item.status === 'submitted' ? 'Ready to grade' : 'Draft in progress'}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground/80">{item.assignment_title} in {item.classroom_name}</p>
                        <p className="text-xs text-foreground/70">
                          {item.submitted_at ? `Submitted ${new Date(item.submitted_at).toLocaleString()}` : `Draft updated ${new Date(item.created_at || '').toLocaleString()}`}
                        </p>
                      </div>
                      <Button asChild variant={item.status === 'submitted' ? 'default' : 'outline'}>
                        <Link href={`/teacher/assignment/${item.assignment_id}`}>{item.status === 'submitted' ? 'Open grading' : 'Open assignment'}</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Teaching Snapshot</CardTitle>
              <CardDescription>Fast context for grading and classroom coverage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-foreground/80">Assignments published</p>
                <p className="text-2xl font-semibold">{assignmentRows.length}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-foreground/80">Graded submissions</p>
                <p className="text-2xl font-semibold">{gradedSubmissionCount}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-foreground/80">School linked</p>
                <Badge variant={profile?.school_id ? 'default' : 'destructive'}>{profile?.school_id ? 'Yes' : 'No'}</Badge>
                <p className="mt-2 text-xs text-foreground/70">All teacher features require school assignment.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {preferences.activity_timeline_widgets && (
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Snapshot of current teaching workload and class momentum.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border p-3 bg-muted/20">
                <p className="text-foreground/80">Active classrooms</p>
                <p className="text-2xl font-semibold">{classrooms.length}</p>
              </div>
              <div className="rounded-lg border p-3 bg-muted/20">
                <p className="text-foreground/80">Total students</p>
                <p className="text-2xl font-semibold">{totalStudents}</p>
              </div>
              <div className="rounded-lg border p-3 bg-muted/20">
                <p className="text-foreground/80">Last refresh</p>
                <p className="text-sm font-medium">{new Date().toLocaleTimeString()}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {showNewClass && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Class</CardTitle>
              <CardDescription>Create a class and generate a shareable class code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="className">Class Name</Label>
                <Input id="className" placeholder="e.g., Intro to Python" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} disabled={creating} />
              </div>
              <div>
                <Label htmlFor="classDesc">Description (optional)</Label>
                <Input id="classDesc" placeholder="Class summary" value={newClassDesc} onChange={(e) => setNewClassDesc(e.target.value)} disabled={creating} />
              </div>
              <Button onClick={handleCreateClass} disabled={creating || !newClassName.trim()}>
                {creating ? 'Creating...' : 'Create Class'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Classroom List</CardTitle>
            <CardDescription>Open a classroom to manage students and assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            {displayedClassrooms.length === 0 ? (
              <p className="text-sm text-foreground/80">No classes yet. Create your first class.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedClassrooms.map((classroom) => (
                  <Card key={classroom.id} className="border">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-foreground">{classroom.name}</CardTitle>
                          <CardDescription>{classroom.description || 'No description'}</CardDescription>
                        </div>
                        <Badge variant="secondary" className="font-mono">{classroom.code}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-foreground/80">Students: {studentsByClass[classroom.id] || 0}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button asChild>
                          <Link href={`/teacher/classroom/${classroom.id}`}>Manage Class</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteClass(classroom.id, classroom.name)}
                          disabled={deletingClassId === classroom.id}
                        >
                          {deletingClassId === classroom.id ? 'Deleting...' : 'Delete Class'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
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
