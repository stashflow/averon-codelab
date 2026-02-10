'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'

export const dynamic = 'force-dynamic'

export default function SchoolAdminPage() {
  const [loading, setLoading] = useState(true)
  const [school, setSchool] = useState<any>(null)
  const [teachers, setTeachers] = useState<any[]>([])
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [selectedClassroomId, setSelectedClassroomId] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [settings, setSettings] = useState({ name: '', max_teachers: 0, max_students: 0 })
  const router = useRouter()

  const unassignedClasses = useMemo(() => classrooms.filter((c) => !c.teacher_id), [classrooms])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, school_id')
        .eq('id', user.id)
        .single()

      let schoolId = profile?.school_id

      if (profile?.role !== 'school_admin') {
        router.push('/protected')
        return
      }

      if (!schoolId) {
        const { data: schoolAdminRow } = await supabase
          .from('school_admins')
          .select('school_id')
          .eq('admin_id', user.id)
          .single()
        schoolId = schoolAdminRow?.school_id
      }

      if (!schoolId) {
        router.push('/protected')
        return
      }

      const [{ data: schoolData }, { data: teacherData }, { data: classData }] = await Promise.all([
        supabase.from('schools').select('*').eq('id', schoolId).single(),
        supabase.from('profiles').select('id, full_name, email, role, school_id').eq('school_id', schoolId).eq('role', 'teacher').order('full_name', { ascending: true }),
        supabase.from('classrooms').select('id, name, code, teacher_id').eq('school_id', schoolId).order('created_at', { ascending: false }),
      ])

      setSchool(schoolData)
      setTeachers(teacherData || [])
      setClassrooms(classData || [])

      if (schoolData) {
        setSettings({
          name: schoolData.name || '',
          max_teachers: schoolData.max_teachers || 0,
          max_students: schoolData.max_students || 0,
        })
      }
    } catch (err) {
      console.error('[v0] school admin load error', err)
    } finally {
      setLoading(false)
    }
  }

  async function assignTeacherToClass() {
    if (!selectedClassroomId || !selectedTeacherId) return
    const supabase = createClient()

    const { error } = await supabase
      .from('classrooms')
      .update({ teacher_id: selectedTeacherId })
      .eq('id', selectedClassroomId)
      .eq('school_id', school.id)

    if (error) {
      alert(error.message)
      return
    }

    setSelectedClassroomId('')
    setSelectedTeacherId('')
    await loadData()
  }

  async function promoteTeacher(teacherId: string) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !school) return

    const updates = await Promise.all([
      supabase.from('profiles').update({ role: 'school_admin' }).eq('id', teacherId),
      supabase.from('school_admins').upsert({ admin_id: teacherId, school_id: school.id, assigned_by: user.id }, { onConflict: 'admin_id,school_id' }),
    ])

    const failed = updates.find((r) => r.error)
    if (failed?.error) {
      alert(failed.error.message)
      return
    }

    await loadData()
  }

  async function saveSchoolSettings() {
    const supabase = createClient()
    const { error } = await supabase
      .from('schools')
      .update({
        name: settings.name,
        max_teachers: Number(settings.max_teachers),
        max_students: Number(settings.max_students),
      })
      .eq('id', school.id)

    if (error) {
      alert(error.message)
      return
    }

    await loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Loading school admin panel...</p>
      </div>
    )
  }

  if (!school) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>No school assigned.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">School Admin Panel</h1>
            <p className="text-sm text-muted-foreground">{school.name}</p>
          </div>
          <ThemeToggle />
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto p-6 space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{teachers.length}</CardTitle>
              <CardDescription>Teachers</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{classrooms.length}</CardTitle>
              <CardDescription>Classes</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{unassignedClasses.length}</CardTitle>
              <CardDescription>Unassigned Classes</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assign Teachers to Classes</CardTitle>
            <CardDescription>Approve/assign school teachers to class ownership.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="h-10 rounded-md border bg-background px-3"
            >
              <option value="">Select class</option>
              {classrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name} ({cls.code})</option>
              ))}
            </select>

            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="h-10 rounded-md border bg-background px-3"
            >
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.full_name || teacher.email}</option>
              ))}
            </select>

            <Button onClick={assignTeacherToClass}>Assign</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teachers</CardTitle>
            <CardDescription>Manage teachers in this school.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teachers.length === 0 && <p className="text-sm text-muted-foreground">No teachers found.</p>}
            {teachers.map((teacher) => (
              <div key={teacher.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="font-medium">{teacher.full_name || 'Unnamed'}</p>
                  <p className="text-sm text-muted-foreground">{teacher.email}</p>
                </div>
                <Button variant="outline" onClick={() => promoteTeacher(teacher.id)}>Promote to School Admin</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>School Settings</CardTitle>
            <CardDescription>Manage school capacity and profile settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name</Label>
              <Input id="schoolName" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxTeachers">Max Teachers</Label>
                <Input id="maxTeachers" type="number" value={settings.max_teachers} onChange={(e) => setSettings({ ...settings, max_teachers: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStudents">Max Students</Label>
                <Input id="maxStudents" type="number" value={settings.max_students} onChange={(e) => setSettings({ ...settings, max_students: Number(e.target.value) })} />
              </div>
            </div>
            <Button onClick={saveSchoolSettings}>Save Settings</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
