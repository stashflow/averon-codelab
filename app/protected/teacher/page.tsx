'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { Plus, LogOut, BookOpen, Settings, Users, GraduationCap } from 'lucide-react'

export const dynamic = 'force-dynamic'

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
  const router = useRouter()

  const studentsByClass = useMemo(() => {
    const map: Record<string, number> = {}
    enrollments.forEach((e: any) => {
      map[e.classroom_id] = (map[e.classroom_id] || 0) + 1
    })
    return map
  }, [enrollments])

  const totalStudents = useMemo(() => Object.values(studentsByClass).reduce((sum, c) => sum + c, 0), [studentsByClass])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, school_id')
        .eq('id', authUser.id)
        .single()

      setProfile(profileData)

      if (profileData?.role !== 'teacher') {
        router.push('/protected')
        return
      }

      if (!profileData?.school_id) {
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
        const { data: enrollmentData } = await supabase.from('enrollments').select('id, classroom_id').in('classroom_id', classIds)
        setEnrollments(enrollmentData || [])
      } else {
        setEnrollments([])
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between h-16">
          <Link href="/protected/teacher" className="flex items-center gap-3">
            <Image src="/ACL.png" alt="ACL Logo" width={40} height={40} className="w-10 h-10" />
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-foreground leading-tight">ACL Teacher</h1>
              <p className="text-xs text-muted-foreground font-medium">Dashboard</p>
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
            <p className="text-sm text-muted-foreground">Manage classrooms, enrollment, and student access.</p>
          </div>
          <Button onClick={() => setShowNewClass(!showNewClass)} className="gap-2">
            <Plus className="w-4 h-4" />
            {showNewClass ? 'Cancel' : 'New Class'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <CardTitle className="text-sm">School Linked</CardTitle>
              <Badge variant={profile?.school_id ? 'default' : 'destructive'}>{profile?.school_id ? 'Yes' : 'No'}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">All teacher features require school assignment.</p>
            </CardContent>
          </Card>
        </div>

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
            {classrooms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes yet. Create your first class.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classrooms.map((classroom) => (
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
                      <p className="text-sm text-muted-foreground">Students: {studentsByClass[classroom.id] || 0}</p>
                      <Button asChild className="w-full">
                        <Link href={`/teacher/classroom/${classroom.id}`}>Manage Class</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
