'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { withCsrfHeaders } from '@/lib/security/csrf-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

type InviteRole = 'full_admin' | 'district_admin' | 'school_admin' | 'teacher' | 'student'
type AdminRole = 'full_admin' | 'district_admin' | 'school_admin'

const roleLabels: Record<InviteRole, string> = {
  full_admin: 'Full Admin',
  district_admin: 'District Admin',
  school_admin: 'School Admin',
  teacher: 'Teacher',
  student: 'Student',
}

function generateClassCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

function getAllowedInviteRoles(role: AdminRole | null): InviteRole[] {
  if (role === 'full_admin') return ['full_admin', 'district_admin', 'school_admin', 'teacher', 'student']
  if (role === 'district_admin') return ['school_admin', 'teacher', 'student']
  return ['teacher', 'student']
}

export default function AdminPanel() {
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentRole, setCurrentRole] = useState<AdminRole | null>(null)
  const [districts, setDistricts] = useState<any[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [classRequests, setClassRequests] = useState<any[]>([])
  const [recentMagicLinks, setRecentMagicLinks] = useState<any[]>([])
  const [studentsCountByClassId, setStudentsCountByClassId] = useState<Record<string, number>>({})
  const [studentClassCountById, setStudentClassCountById] = useState<Record<string, number>>({})
  const [studentLessonCompletedById, setStudentLessonCompletedById] = useState<Record<string, number>>({})
  const [newDistrict, setNewDistrict] = useState({ name: '', code: '' })
  const [newSchool, setNewSchool] = useState({ name: '', district_id: '', max_teachers: 25, max_students: 1500 })
  const [newClassroom, setNewClassroom] = useState({ name: '', description: '', school_id: '', teacher_id: '', max_students: 30, code: '' })
  const [invite, setInvite] = useState({
    email: '',
    role: 'district_admin' as InviteRole,
    district_id: '',
    school_id: '',
    expires_in_hours: 72,
  })
  const [promotion, setPromotion] = useState({ teacher_id: '', school_id: '' })
  const [classAssignment, setClassAssignment] = useState({ classroom_id: '', teacher_id: '' })
  const [generatedInvite, setGeneratedInvite] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [submittingInvite, setSubmittingInvite] = useState(false)
  const router = useRouter()

  const canManageOrganization = currentRole === 'full_admin'
  const canReviewRequests = currentRole === 'full_admin'
  const canCreateInvites = currentRole === 'full_admin' || currentRole === 'district_admin' || currentRole === 'school_admin'

  const districtById = useMemo(() => Object.fromEntries(districts.map((d) => [d.id, d])), [districts])
  const schoolById = useMemo(() => Object.fromEntries(schools.map((s) => [s.id, s])), [schools])
  const teacherById = useMemo(() => Object.fromEntries(teachers.map((t) => [t.id, t])), [teachers])

  const allowedInviteRoles = useMemo<InviteRole[]>(() => getAllowedInviteRoles(currentRole), [currentRole])

  const filteredSchools = useMemo(() => {
    if (!invite.district_id) return schools
    return schools.filter((s) => s.district_id === invite.district_id)
  }, [invite.district_id, schools])

  const pendingRequests = useMemo(() => classRequests.filter((r) => r.status === 'pending'), [classRequests])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    const supabase = createClient()
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUserId(user.id)

      const { data: profile } = await supabase.from('profiles').select('role, school_id').eq('id', user.id).single()
      const role = (profile?.role || '') as AdminRole
      if (!['full_admin', 'district_admin', 'school_admin'].includes(role)) {
        router.push('/protected')
        return
      }
      setCurrentRole(role)
      const scopedAllowedInviteRoles = getAllowedInviteRoles(role)

      const districtAdminRows = role === 'district_admin'
        ? (await supabase.from('district_admins').select('district_id').eq('admin_id', user.id)).data || []
        : []

      const schoolAdminRows = role === 'school_admin'
        ? (await supabase.from('school_admins').select('school_id').eq('admin_id', user.id)).data || []
        : []

      const scopedDistrictIds = Array.from(new Set((districtAdminRows || []).map((d: any) => d.district_id).filter(Boolean)))
      const scopedSchoolIds = Array.from(
        new Set(
          ([profile?.school_id, ...(schoolAdminRows || []).map((s: any) => s.school_id)] as string[]).filter(Boolean),
        ),
      )

      const districtsQuery = supabase.from('districts').select('id, name, code, district_code, created_at').order('name', { ascending: true })
      const schoolsQuery = supabase.from('schools').select('id, name, district_id, admin_id, max_teachers, max_students, is_active').order('name', { ascending: true })
      const teachersQuery = supabase.from('profiles').select('id, full_name, email, role, school_id').in('role', ['teacher', 'school_admin']).order('full_name', { ascending: true })
      const studentsQuery = supabase.from('profiles').select('id, full_name, email, role, school_id').eq('role', 'student').order('full_name', { ascending: true })
      const classroomsQuery = supabase
        .from('classrooms')
        .select('id, name, description, code, school_id, district_id, teacher_id, is_active, pending_activation, max_students, created_at')
        .order('created_at', { ascending: false })
      const requestsQuery = supabase
        .from('class_requests')
        .select('id, district_id, classroom_id, status, requested_by, reviewed_by, requested_at, reviewed_at')
        .order('requested_at', { ascending: false })
      const linksQuery = supabase
        .from('magic_links')
        .select('id, email, role, district_id, school_id, created_at, expires_at, used_at')
        .order('created_at', { ascending: false })
        .limit(25)

      let districtsData: any[] = []
      let schoolsData: any[] = []
      let teachersData: any[] = []
      let studentsData: any[] = []
      let classroomsData: any[] = []
      let requestsData: any[] = []

      if (role === 'full_admin') {
        const [{ data: d }, { data: s }, { data: t }, { data: st }, { data: c }, { data: r }] = await Promise.all([
          districtsQuery,
          schoolsQuery,
          teachersQuery,
          studentsQuery,
          classroomsQuery,
          requestsQuery,
        ])
        districtsData = d || []
        schoolsData = s || []
        teachersData = t || []
        studentsData = st || []
        classroomsData = c || []
        requestsData = r || []
      } else if (role === 'district_admin') {
        const [{ data: d }, { data: s }, { data: r }] = await Promise.all([
          scopedDistrictIds.length ? districtsQuery.in('id', scopedDistrictIds) : Promise.resolve({ data: [] as any[] }),
          scopedDistrictIds.length ? schoolsQuery.in('district_id', scopedDistrictIds) : Promise.resolve({ data: [] as any[] }),
          scopedDistrictIds.length ? requestsQuery.in('district_id', scopedDistrictIds) : Promise.resolve({ data: [] as any[] }),
        ])

        const districtSchoolIds = (s || []).map((row: any) => row.id)
        const [{ data: t }, { data: st }, { data: c }] = await Promise.all([
          districtSchoolIds.length ? teachersQuery.in('school_id', districtSchoolIds) : Promise.resolve({ data: [] as any[] }),
          districtSchoolIds.length ? studentsQuery.in('school_id', districtSchoolIds) : Promise.resolve({ data: [] as any[] }),
          districtSchoolIds.length ? classroomsQuery.in('school_id', districtSchoolIds) : Promise.resolve({ data: [] as any[] }),
        ])

        districtsData = d || []
        schoolsData = s || []
        teachersData = t || []
        studentsData = st || []
        classroomsData = c || []
        requestsData = r || []
      } else {
        const [{ data: s }, { data: t }, { data: st }, { data: c }] = await Promise.all([
          scopedSchoolIds.length ? schoolsQuery.in('id', scopedSchoolIds) : Promise.resolve({ data: [] as any[] }),
          scopedSchoolIds.length ? teachersQuery.in('school_id', scopedSchoolIds) : Promise.resolve({ data: [] as any[] }),
          scopedSchoolIds.length ? studentsQuery.in('school_id', scopedSchoolIds) : Promise.resolve({ data: [] as any[] }),
          scopedSchoolIds.length ? classroomsQuery.in('school_id', scopedSchoolIds) : Promise.resolve({ data: [] as any[] }),
        ])

        const scopedDistricts = Array.from(new Set((s || []).map((row: any) => row.district_id).filter(Boolean)))
        const { data: d } = scopedDistricts.length ? await districtsQuery.in('id', scopedDistricts) : { data: [] as any[] }
        const { data: r } = scopedDistricts.length ? await requestsQuery.in('district_id', scopedDistricts) : { data: [] as any[] }

        districtsData = d || []
        schoolsData = s || []
        teachersData = t || []
        studentsData = st || []
        classroomsData = c || []
        requestsData = r || []
      }

      const classIds = (classroomsData || []).map((c: any) => c.id)
      const studentIds = (studentsData || []).map((s: any) => s.id)

      const [{ data: enrollmentData }, { data: linksData }, { data: progressData }] = await Promise.all([
        classIds.length ? supabase.from('enrollments').select('classroom_id, student_id').in('classroom_id', classIds) : Promise.resolve({ data: [] as any[] }),
        canCreateInvites ? linksQuery : Promise.resolve({ data: [] as any[] }),
        studentIds.length ? supabase.from('student_lesson_progress').select('student_id, status').in('student_id', studentIds) : Promise.resolve({ data: [] as any[] }),
      ])

      const studentCounts: Record<string, number> = {}
      const studentClassCounts: Record<string, number> = {}
      ;(enrollmentData || []).forEach((row: any) => {
        studentCounts[row.classroom_id] = (studentCounts[row.classroom_id] || 0) + 1
        studentClassCounts[row.student_id] = (studentClassCounts[row.student_id] || 0) + 1
      })

      const completedLessonsByStudent: Record<string, number> = {}
      ;(progressData || []).forEach((row: any) => {
        if (row.status === 'completed') {
          completedLessonsByStudent[row.student_id] = (completedLessonsByStudent[row.student_id] || 0) + 1
        }
      })

      setStudentsCountByClassId(studentCounts)
      setStudentClassCountById(studentClassCounts)
      setStudentLessonCompletedById(completedLessonsByStudent)
      setDistricts(districtsData)
      setSchools(schoolsData)
      setTeachers(teachersData)
      setStudents(studentsData)
      setClassrooms(classroomsData)
      setClassRequests(requestsData)
      setRecentMagicLinks(linksData || [])

      const defaultDistrictId = districtsData[0]?.id || ''
      const defaultSchoolId = schoolsData[0]?.id || ''
      setInvite((prev) => ({
        ...prev,
        role: scopedAllowedInviteRoles.includes(prev.role) ? prev.role : scopedAllowedInviteRoles[0],
        district_id: prev.district_id || defaultDistrictId,
        school_id: prev.school_id || defaultSchoolId,
      }))

      if (!newSchool.district_id && defaultDistrictId) {
        setNewSchool((prev) => ({ ...prev, district_id: defaultDistrictId }))
      }
      if (!newClassroom.school_id && defaultSchoolId) {
        setNewClassroom((prev) => ({ ...prev, school_id: defaultSchoolId }))
      }
    } catch (err) {
      console.error('[v0] admin panel load error', err)
    } finally {
      setLoading(false)
    }
  }

  async function createDistrict() {
    if (!canManageOrganization || !newDistrict.name.trim() || !currentUserId) return
    const supabase = createClient()
    const generatedCode = (newDistrict.code || generateClassCode()).toUpperCase()

    const { error } = await supabase.from('districts').insert({
      name: newDistrict.name,
      code: generatedCode,
      district_code: generatedCode,
      created_by: currentUserId,
    })

    if (error) {
      alert(error.message)
      return
    }

    setNewDistrict({ name: '', code: '' })
    await loadData()
  }

  async function createSchool() {
    if (!canManageOrganization || !newSchool.name || !newSchool.district_id) return
    const supabase = createClient()

    const { error } = await supabase.from('schools').insert({
      name: newSchool.name,
      district_id: newSchool.district_id,
      max_teachers: Number(newSchool.max_teachers),
      max_students: Number(newSchool.max_students),
      is_active: true,
    })

    if (error) {
      alert(error.message)
      return
    }

    setNewSchool({ name: '', district_id: newSchool.district_id, max_teachers: 25, max_students: 1500 })
    await loadData()
  }

  async function createClassroom() {
    if (!newClassroom.name.trim() || !newClassroom.school_id) return
    const supabase = createClient()
    const classCode = (newClassroom.code || generateClassCode()).toUpperCase()

    const { error } = await supabase.from('classrooms').insert({
      name: newClassroom.name,
      description: newClassroom.description,
      code: classCode,
      school_id: newClassroom.school_id,
      teacher_id: newClassroom.teacher_id || null,
      max_students: Number(newClassroom.max_students || 30),
      is_active: true,
      pending_activation: false,
    })

    if (error) {
      alert(error.message)
      return
    }

    setNewClassroom((prev) => ({
      ...prev,
      name: '',
      description: '',
      teacher_id: '',
      code: '',
      max_students: 30,
    }))
    await loadData()
  }

  async function promoteTeacherToSchoolAdmin() {
    if (!canManageOrganization || !promotion.teacher_id || !promotion.school_id) return
    const supabase = createClient()

    const [profileUpdate, schoolAdminCreate] = await Promise.all([
      supabase.from('profiles').update({ role: 'school_admin', school_id: promotion.school_id }).eq('id', promotion.teacher_id),
      supabase
        .from('school_admins')
        .upsert({ admin_id: promotion.teacher_id, school_id: promotion.school_id, assigned_by: currentUserId }, { onConflict: 'admin_id,school_id' }),
    ])

    if (profileUpdate.error || schoolAdminCreate.error) {
      alert(profileUpdate.error?.message || schoolAdminCreate.error?.message)
      return
    }

    setPromotion({ teacher_id: '', school_id: '' })
    await loadData()
  }

  async function assignTeacherToClass() {
    if (!classAssignment.classroom_id) return
    const supabase = createClient()
    const { error } = await supabase
      .from('classrooms')
      .update({ teacher_id: classAssignment.teacher_id || null })
      .eq('id', classAssignment.classroom_id)

    if (error) {
      alert(error.message)
      return
    }

    setClassAssignment({ classroom_id: '', teacher_id: '' })
    await loadData()
  }

  async function reviewClassRequest(requestId: string, classroomId: string, decision: 'approved' | 'rejected') {
    if (!canReviewRequests) return
    const supabase = createClient()

    const updates: Record<string, any> = {
      status: decision,
      reviewed_by: currentUserId,
      reviewed_at: new Date().toISOString(),
    }

    const [{ error: requestError }, { error: classError }] = await Promise.all([
      supabase.from('class_requests').update(updates).eq('id', requestId),
      supabase
        .from('classrooms')
        .update({
          pending_activation: false,
          is_active: decision === 'approved',
        })
        .eq('id', classroomId),
    ])

    if (requestError || classError) {
      alert(requestError?.message || classError?.message)
      return
    }

    await loadData()
  }

  function setInviteRole(role: InviteRole) {
    if (!allowedInviteRoles.includes(role)) return
    setInvite((prev) => ({
      ...prev,
      role,
      district_id: role === 'full_admin' ? '' : prev.district_id,
      school_id: role === 'full_admin' || role === 'district_admin' ? '' : prev.school_id,
    }))
  }

  async function generateInvite() {
    if (!canCreateInvites) return
    if (!invite.email.trim()) {
      alert('Email is required')
      return
    }

    const needsDistrict = invite.role === 'district_admin'
    const needsSchool = invite.role === 'school_admin' || invite.role === 'teacher' || invite.role === 'student'

    if (needsDistrict && !invite.district_id) {
      alert('Select a district for district admin invite')
      return
    }

    if (needsSchool && !invite.school_id) {
      alert('Select a school for this invite type')
      return
    }

    setSubmittingInvite(true)
    const payload: any = {
      email: invite.email,
      role: invite.role,
      expires_in_hours: Number(invite.expires_in_hours),
    }

    if (invite.district_id) payload.district_id = invite.district_id
    if (invite.school_id) payload.school_id = invite.school_id

    const response = await fetch('/api/magic-links/create', {
      method: 'POST',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    setSubmittingInvite(false)

    if (!response.ok) {
      alert(data?.error || 'Failed to create invite')
      return
    }

    setGeneratedInvite(data.invite_url)
    setInvite((prev) => ({ ...prev, email: '' }))
    await loadData()
  }

  async function copyInviteLink() {
    if (!generatedInvite) return
    await navigator.clipboard.writeText(generatedInvite)
  }

  async function copyClassCode(code: string) {
    await navigator.clipboard.writeText(code)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Loading admin panel...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{roleLabels[(currentRole || 'full_admin') as InviteRole]} Panel</h1>
            <p className="text-muted-foreground">
              Full admins can do everything. District and school admins see the same data model scoped to their permissions.
            </p>
          </div>
          {currentRole === 'full_admin' && (
            <Button
              onClick={() => router.push('/admin/support-center')}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              Advanced Support Center
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{districts.length}</CardTitle>
              <CardDescription>Districts</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{schools.length}</CardTitle>
              <CardDescription>Schools</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{teachers.length}</CardTitle>
              <CardDescription>Teachers/Admins</CardDescription>
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
              <CardTitle>{students.length}</CardTitle>
              <CardDescription>Students</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 md:grid-cols-7 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="invitations">Invites</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Summary</CardTitle>
                <CardDescription>Quick rollup of active entities in your scope.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Pending Class Requests</p>
                  <p className="text-2xl font-semibold">{pendingRequests.length}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Classes With Teachers</p>
                  <p className="text-2xl font-semibold">{classrooms.filter((c) => !!c.teacher_id).length}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Active Magic Links</p>
                  <p className="text-2xl font-semibold">{recentMagicLinks.filter((l) => !l.used_at).length}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Magic Links</CardTitle>
                <CardDescription>Create secure invitation links for account onboarding.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canCreateInvites && <p className="text-sm text-muted-foreground">Your role does not allow creating invites.</p>}
                <div className="flex flex-wrap gap-2">
                  {allowedInviteRoles.map((role) => (
                    <Button key={role} variant={invite.role === role ? 'default' : 'outline'} onClick={() => setInviteRole(role)}>
                      {roleLabels[role]}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="inviteEmail">Invite Email</Label>
                    <Input id="inviteEmail" type="email" value={invite.email} onChange={(e) => setInvite((prev) => ({ ...prev, email: e.target.value }))} placeholder="admin@district.org" />
                  </div>

                  {invite.role === 'district_admin' && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="inviteDistrict">District</Label>
                      <select
                        id="inviteDistrict"
                        value={invite.district_id}
                        onChange={(e) => setInvite((prev) => ({ ...prev, district_id: e.target.value, school_id: '' }))}
                        className="w-full h-10 rounded-md border px-3 bg-background"
                      >
                        <option value="">Select district</option>
                        {districts.map((district) => (
                          <option key={district.id} value={district.id}>{district.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(invite.role === 'school_admin' || invite.role === 'teacher' || invite.role === 'student') && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="filterDistrict">District (optional filter)</Label>
                        <select
                          id="filterDistrict"
                          value={invite.district_id}
                          onChange={(e) => setInvite((prev) => ({ ...prev, district_id: e.target.value, school_id: '' }))}
                          className="w-full h-10 rounded-md border px-3 bg-background"
                        >
                          <option value="">All districts</option>
                          {districts.map((district) => (
                            <option key={district.id} value={district.id}>{district.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inviteSchool">School</Label>
                        <select
                          id="inviteSchool"
                          value={invite.school_id}
                          onChange={(e) => setInvite((prev) => ({ ...prev, school_id: e.target.value }))}
                          className="w-full h-10 rounded-md border px-3 bg-background"
                        >
                          <option value="">Select school</option>
                          {filteredSchools.map((school) => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="expires">Expires In (hours)</Label>
                    <Input
                      id="expires"
                      type="number"
                      min={1}
                      value={invite.expires_in_hours}
                      onChange={(e) => setInvite((prev) => ({ ...prev, expires_in_hours: Number(e.target.value) || 72 }))}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={generateInvite} disabled={!canCreateInvites || submittingInvite}>{submittingInvite ? 'Generating...' : `Generate ${roleLabels[invite.role]} Link`}</Button>
                  {generatedInvite && <Button variant="outline" onClick={copyInviteLink}>Copy Link</Button>}
                </div>

                {generatedInvite && (
                  <div className="rounded-md border p-3">
                    <p className="text-sm font-medium">Generated Invitation URL</p>
                    <a className="text-sm underline break-all" href={generatedInvite}>{generatedInvite}</a>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Magic Links</CardTitle>
                <CardDescription>Latest invitations and status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentMagicLinks.length === 0 && <p className="text-sm text-muted-foreground">No links yet.</p>}
                {recentMagicLinks.map((link) => (
                  <div key={link.id} className="border rounded-md p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{link.email}</p>
                        <p className="text-muted-foreground">
                          {roleLabels[link.role as InviteRole] || link.role}
                          {link.district_id ? ` • ${districtById[link.district_id]?.name || 'District'}` : ''}
                          {link.school_id ? ` • ${schoolById[link.school_id]?.name || 'School'}` : ''}
                        </p>
                      </div>
                      <Badge variant={link.used_at ? 'secondary' : 'default'}>{link.used_at ? 'Used' : 'Active'}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organization" className="space-y-6">
            {canManageOrganization ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Create District</CardTitle>
                    <CardDescription>Create districts for new organizations.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="districtName">District Name</Label>
                        <Input id="districtName" value={newDistrict.name} onChange={(e) => setNewDistrict((prev) => ({ ...prev, name: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="districtCode">District Code (optional)</Label>
                        <Input id="districtCode" value={newDistrict.code} onChange={(e) => setNewDistrict((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} placeholder="AUTO if empty" />
                      </div>
                    </div>
                    <Button onClick={createDistrict}>Create District</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Create School</CardTitle>
                    <CardDescription>Manage schools within districts.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="schoolName">School Name</Label>
                        <Input id="schoolName" value={newSchool.name} onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="district">District</Label>
                        <select
                          id="district"
                          value={newSchool.district_id}
                          onChange={(e) => setNewSchool({ ...newSchool, district_id: e.target.value })}
                          className="w-full h-10 rounded-md border px-3 bg-background"
                        >
                          <option value="">Select district</option>
                          {districts.map((district) => (
                            <option key={district.id} value={district.id}>{district.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxTeachers">Max Teachers</Label>
                        <Input id="maxTeachers" type="number" value={newSchool.max_teachers} onChange={(e) => setNewSchool({ ...newSchool, max_teachers: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxStudents">Max Students</Label>
                        <Input id="maxStudents" type="number" value={newSchool.max_students} onChange={(e) => setNewSchool({ ...newSchool, max_students: Number(e.target.value) })} />
                      </div>
                    </div>
                    <Button onClick={createSchool}>Create School</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Promote Teacher to School Admin</CardTitle>
                    <CardDescription>Grant school admin permissions to an existing teacher.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select value={promotion.teacher_id} onChange={(e) => setPromotion({ ...promotion, teacher_id: e.target.value })} className="h-10 rounded-md border px-3 bg-background">
                      <option value="">Select teacher</option>
                      {teachers.filter((t) => t.role === 'teacher').map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>{teacher.full_name || teacher.email}</option>
                      ))}
                    </select>
                    <select value={promotion.school_id} onChange={(e) => setPromotion({ ...promotion, school_id: e.target.value })} className="h-10 rounded-md border px-3 bg-background">
                      <option value="">Select school</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>{school.name}</option>
                      ))}
                    </select>
                    <Button onClick={promoteTeacherToSchoolAdmin}>Promote</Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Organization Controls</CardTitle>
                  <CardDescription>Only full admins can create districts/schools and promote school admins.</CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Class Requests</CardTitle>
                <CardDescription>District request queue. Full admins can approve/reject and activate classes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {classRequests.length === 0 && <p className="text-sm text-muted-foreground">No class requests found.</p>}
                {classRequests.map((request) => {
                  const classroom = classrooms.find((c) => c.id === request.classroom_id)
                  const district = districtById[request.district_id]
                  return (
                    <div key={request.id} className="border rounded-md p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{classroom?.name || 'Classroom'} • {district?.name || 'District'}</p>
                          <p className="text-muted-foreground">Status: {request.status}</p>
                        </div>
                        <div className="flex gap-2">
                          {canReviewRequests && request.status === 'pending' && (
                            <>
                              <Button size="sm" onClick={() => reviewClassRequest(request.id, request.classroom_id, 'approved')}>Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => reviewClassRequest(request.id, request.classroom_id, 'rejected')}>Reject</Button>
                            </>
                          )}
                          {!canReviewRequests && <Badge variant="secondary">Read Only</Badge>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Class</CardTitle>
                <CardDescription>Full admin can create classes directly with class codes and assignments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {canManageOrganization ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="className">Class Name</Label>
                        <Input id="className" value={newClassroom.name} onChange={(e) => setNewClassroom((prev) => ({ ...prev, name: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="classSchool">School</Label>
                        <select
                          id="classSchool"
                          value={newClassroom.school_id}
                          onChange={(e) => setNewClassroom((prev) => ({ ...prev, school_id: e.target.value }))}
                          className="w-full h-10 rounded-md border px-3 bg-background"
                        >
                          <option value="">Select school</option>
                          {schools.map((school) => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="classTeacher">Teacher (optional)</Label>
                        <select
                          id="classTeacher"
                          value={newClassroom.teacher_id}
                          onChange={(e) => setNewClassroom((prev) => ({ ...prev, teacher_id: e.target.value }))}
                          className="w-full h-10 rounded-md border px-3 bg-background"
                        >
                          <option value="">Unassigned</option>
                          {teachers
                            .filter((t) => !newClassroom.school_id || t.school_id === newClassroom.school_id)
                            .map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>{teacher.full_name || teacher.email}</option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="classDescription">Description</Label>
                        <Input id="classDescription" value={newClassroom.description} onChange={(e) => setNewClassroom((prev) => ({ ...prev, description: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="classCode">Class Code (optional)</Label>
                        <Input id="classCode" value={newClassroom.code} onChange={(e) => setNewClassroom((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} placeholder="AUTO if empty" />
                      </div>
                    </div>
                    <Button onClick={createClassroom}>Create Class</Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Class creation from this panel is reserved for full admins.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assign Teacher to Class</CardTitle>
                <CardDescription>School and full admins can assign teacher ownership.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select value={classAssignment.classroom_id} onChange={(e) => setClassAssignment((prev) => ({ ...prev, classroom_id: e.target.value }))} className="h-10 rounded-md border px-3 bg-background">
                  <option value="">Select class</option>
                  {classrooms.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name} ({cls.code})</option>
                  ))}
                </select>

                <select value={classAssignment.teacher_id} onChange={(e) => setClassAssignment((prev) => ({ ...prev, teacher_id: e.target.value }))} className="h-10 rounded-md border px-3 bg-background">
                  <option value="">Unassigned</option>
                  {teachers
                    .filter((teacher) => {
                      if (!classAssignment.classroom_id) return true
                      const selectedClass = classrooms.find((cls) => cls.id === classAssignment.classroom_id)
                      if (!selectedClass?.school_id) return true
                      return teacher.school_id === selectedClass.school_id
                    })
                    .map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>{teacher.full_name || teacher.email}</option>
                    ))}
                </select>

                <Button onClick={assignTeacherToClass}>Assign</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Class Directory</CardTitle>
                <CardDescription>Class codes, assigned teachers, students, and state.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {classrooms.length === 0 && <p className="text-sm text-muted-foreground">No classes found.</p>}
                {classrooms.map((cls) => (
                  <div key={cls.id} className="border rounded-md p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{cls.name}</p>
                        <p className="text-muted-foreground">
                          {schoolById[cls.school_id]?.name || 'School'} • {teacherById[cls.teacher_id]?.full_name || teacherById[cls.teacher_id]?.email || 'Unassigned'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={cls.is_active ? 'default' : 'secondary'}>{cls.is_active ? 'Active' : 'Inactive'}</Badge>
                        <Button size="sm" variant="outline" onClick={() => copyClassCode(cls.code)}>Copy {cls.code}</Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-1">Students: {studentsCountByClassId[cls.id] || 0}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Students and Progress</CardTitle>
                <CardDescription>View student enrollment footprint and completion progress.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {students.length === 0 && <p className="text-sm text-muted-foreground">No students found.</p>}
                {students.map((student) => {
                  const enrolledClassCount = studentClassCountById[student.id] || 0

                  return (
                    <div key={student.id} className="border rounded-md p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{student.full_name || 'Unnamed Student'}</p>
                          <p className="text-muted-foreground">{student.email || 'No email'} • {schoolById[student.school_id]?.name || 'No School'}</p>
                        </div>
                        <Badge variant="outline">Completed Lessons: {studentLessonCompletedById[student.id] || 0}</Badge>
                      </div>
                      <p className="text-muted-foreground mt-1">Classroom visibility: {enrolledClassCount} class records in scope</p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Class-Level Enrollment</CardTitle>
                <CardDescription>Students per class for quick intervention.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {classrooms.map((cls) => (
                  <div key={cls.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{cls.name}</p>
                    <p className="text-muted-foreground">Students: {studentsCountByClassId[cls.id] || 0}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hierarchy">
            <Card>
              <CardHeader>
                <CardTitle>Complete Hierarchy</CardTitle>
                <CardDescription>Full Admin → Districts → Schools → Teachers → Classes → Students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {districts.map((district) => {
                  const districtSchools = schools.filter((s) => s.district_id === district.id)
                  return (
                    <div key={district.id} className="border rounded-md p-4">
                      <h3 className="text-lg font-semibold">District: {district.name}</h3>
                      <div className="space-y-3 mt-3">
                        {districtSchools.length === 0 && <p className="text-sm text-muted-foreground">No schools yet.</p>}
                        {districtSchools.map((school) => {
                          const schoolTeachers = teachers.filter((t) => t.school_id === school.id)
                          const schoolStudents = students.filter((s) => s.school_id === school.id)
                          const schoolClasses = classrooms.filter((c) => c.school_id === school.id)
                          return (
                            <div key={school.id} className="border rounded-md p-3">
                              <p className="font-medium">School: {school.name}</p>
                              <p className="text-sm text-muted-foreground">Teachers: {schoolTeachers.length} | Classes: {schoolClasses.length} | Students: {schoolStudents.length}</p>
                              <div className="mt-2 space-y-2">
                                {schoolClasses.map((cls) => (
                                  <div key={cls.id} className="text-sm border rounded px-2 py-1">
                                    <p>Class: {cls.name} ({cls.code})</p>
                                    <p className="text-muted-foreground">Students: {studentsCountByClassId[cls.id] || 0}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
