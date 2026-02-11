'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Users, 
  Building2, 
  School, 
  GraduationCap,
  Trash2,
  AlertCircle,
  CheckCircle,
  Mail,
  Lock,
  UserCog,
  Shield,
  Activity,
  BarChart3
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type User = {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
  last_sign_in_at: string
  district_name?: string
  school_name?: string
  deleted_at?: string
}

type District = {
  id: string
  name: string
  created_at: string
  school_count: number
  user_count: number
  deleted_at?: string
}

type School = {
  id: string
  name: string
  district_name: string
  created_at: string
  classroom_count: number
  user_count: number
  deleted_at?: string
}

type Classroom = {
  id: string
  name: string
  school_name: string
  district_name: string
  teacher_name: string
  student_count: number
  created_at: string
  deleted_at?: string
}

export default function AdminSupportCenter() {
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteType, setDeleteType] = useState<'user' | 'district' | 'school' | 'classroom' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDistricts: 0,
    totalSchools: 0,
    totalClassrooms: 0,
    activeUsers24h: 0
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [usersRes, districtsRes, schoolsRes, classroomsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('districts').select('id', { count: 'exact', head: true }),
        supabase.from('schools').select('id', { count: 'exact', head: true }),
        supabase.from('classrooms').select('id', { count: 'exact', head: true })
      ])

      setStats({
        totalUsers: usersRes.count || 0,
        totalDistricts: districtsRes.count || 0,
        totalSchools: schoolsRes.count || 0,
        totalClassrooms: classroomsRes.count || 0,
        activeUsers24h: 0 // Can be enhanced with activity tracking
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const searchUsers = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          created_at,
          user_roles (role),
          district_admins (district:districts(name)),
          school_admins (school:schools(name))
        `)
        .or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(20)

      if (error) throw error

      const formattedUsers = data?.map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.user_roles?.[0]?.role || 'student',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        district_name: user.district_admins?.[0]?.district?.name,
        school_name: user.school_admins?.[0]?.school?.name
      })) || []

      setUsers(formattedUsers)
    } catch (error) {
      console.error('Error searching users:', error)
      showAlert('error', 'Failed to search users')
    } finally {
      setLoading(false)
    }
  }

  const searchDistricts = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('districts')
        .select(`
          id,
          name,
          created_at,
          deleted_at,
          schools (count),
          district_admins (count)
        `)
        .ilike('name', `%${searchQuery}%`)
        .limit(20)

      if (error) throw error

      const formattedDistricts = data?.map((district: any) => ({
        id: district.id,
        name: district.name,
        created_at: district.created_at,
        deleted_at: district.deleted_at,
        school_count: district.schools?.[0]?.count || 0,
        user_count: district.district_admins?.[0]?.count || 0
      })) || []

      setDistricts(formattedDistricts)
    } catch (error) {
      console.error('Error searching districts:', error)
      showAlert('error', 'Failed to search districts')
    } finally {
      setLoading(false)
    }
  }

  const searchSchools = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('schools')
        .select(`
          id,
          name,
          created_at,
          deleted_at,
          district:districts(name),
          classrooms (count),
          school_admins (count)
        `)
        .ilike('name', `%${searchQuery}%`)
        .limit(20)

      if (error) throw error

      const formattedSchools = data?.map((school: any) => ({
        id: school.id,
        name: school.name,
        district_name: school.district?.name || 'Unknown',
        created_at: school.created_at,
        deleted_at: school.deleted_at,
        classroom_count: school.classrooms?.[0]?.count || 0,
        user_count: school.school_admins?.[0]?.count || 0
      })) || []

      setSchools(formattedSchools)
    } catch (error) {
      console.error('Error searching schools:', error)
      showAlert('error', 'Failed to search schools')
    } finally {
      setLoading(false)
    }
  }

  const searchClassrooms = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select(`
          id,
          name,
          created_at,
          deleted_at,
          school:schools(name, district:districts(name)),
          teacher:profiles!classrooms_teacher_id_fkey(full_name),
          classroom_students (count)
        `)
        .ilike('name', `%${searchQuery}%`)
        .limit(20)

      if (error) throw error

      const formattedClassrooms = data?.map((classroom: any) => ({
        id: classroom.id,
        name: classroom.name,
        school_name: classroom.school?.name || 'Unknown',
        district_name: classroom.school?.district?.name || 'Unknown',
        teacher_name: classroom.teacher?.full_name || 'Unknown',
        student_count: classroom.classroom_students?.[0]?.count || 0,
        created_at: classroom.created_at,
        deleted_at: classroom.deleted_at
      })) || []

      setClassrooms(formattedClassrooms)
    } catch (error) {
      console.error('Error searching classrooms:', error)
      showAlert('error', 'Failed to search classrooms')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !deleteType) return

    setLoading(true)
    try {
      const endpoints = {
        user: '/api/admin/delete-account',
        district: '/api/admin/delete-district',
        school: '/api/admin/delete-school',
        classroom: '/api/admin/delete-classroom'
      }

      const payload = {
        user: { target_user_id: deleteTarget.id, reason: deleteReason },
        district: { district_id: deleteTarget.id },
        school: { school_id: deleteTarget.id },
        classroom: { classroom_id: deleteTarget.id }
      }

      const response = await fetch(endpoints[deleteType], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload[deleteType])
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Delete failed')
      }

      showAlert('success', `${deleteType.charAt(0).toUpperCase() + deleteType.slice(1)} deleted successfully`)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      setDeleteType(null)
      setDeleteReason('')
      
      // Refresh the list
      if (deleteType === 'user') searchUsers()
      else if (deleteType === 'district') searchDistricts()
      else if (deleteType === 'school') searchSchools()
      else if (deleteType === 'classroom') searchClassrooms()
      
      loadStats()
    } catch (error: any) {
      console.error('Error deleting:', error)
      showAlert('error', error.message || 'Failed to delete')
    } finally {
      setLoading(false)
    }
  }

  const openDeleteDialog = (type: 'user' | 'district' | 'school' | 'classroom', target: any) => {
    setDeleteType(type)
    setDeleteTarget(target)
    setDeleteDialogOpen(true)
  }

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 5000)
  }

  const resetPassword = async (userId: string, email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error
      showAlert('success', 'Password reset email sent successfully')
    } catch (error) {
      console.error('Error sending reset email:', error)
      showAlert('error', 'Failed to send password reset email')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Admin Support Center</h1>
            <p className="text-muted-foreground mt-2">Comprehensive user and system management</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Shield className="w-4 h-4 mr-2" />
            Full Admin Access
          </Badge>
        </div>

        {/* Alert */}
        {alert && (
          <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
            {alert.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{alert.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.totalUsers}</div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Districts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.totalDistricts}</div>
                <Building2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Schools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.totalSchools}</div>
                <School className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Classrooms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.totalClassrooms}</div>
                <GraduationCap className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active (24h)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.activeUsers24h}</div>
                <Activity className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Manage</CardTitle>
            <CardDescription>Search for users, districts, schools, or classrooms to manage</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="users">
                  <Users className="w-4 h-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="districts">
                  <Building2 className="w-4 h-4 mr-2" />
                  Districts
                </TabsTrigger>
                <TabsTrigger value="schools">
                  <School className="w-4 h-4 mr-2" />
                  Schools
                </TabsTrigger>
                <TabsTrigger value="classrooms">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Classrooms
                </TabsTrigger>
              </TabsList>

              {/* Search Bar */}
              <div className="flex gap-2 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const activeTab = document.querySelector('[data-state="active"]')?.getAttribute('value')
                        if (activeTab === 'users') searchUsers()
                        else if (activeTab === 'districts') searchDistricts()
                        else if (activeTab === 'schools') searchSchools()
                        else if (activeTab === 'classrooms') searchClassrooms()
                      }
                    }}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => {
                  const activeTab = document.querySelector('[data-state="active"]')?.getAttribute('value')
                  if (activeTab === 'users') searchUsers()
                  else if (activeTab === 'districts') searchDistricts()
                  else if (activeTab === 'schools') searchSchools()
                  else if (activeTab === 'classrooms') searchClassrooms()
                }} disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {/* Users Tab */}
              <TabsContent value="users" className="space-y-4">
                {users.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Search for users to get started
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <Card key={user.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{user.full_name}</h3>
                                <Badge variant={user.role === 'full_admin' ? 'default' : 'secondary'}>
                                  {user.role}
                                </Badge>
                                {user.deleted_at && <Badge variant="destructive">Deleted</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>Created: {new Date(user.created_at).toLocaleDateString()}</span>
                                {user.district_name && <span>District: {user.district_name}</span>}
                                {user.school_name && <span>School: {user.school_name}</span>}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetPassword(user.id, user.email)}
                              >
                                <Lock className="w-4 h-4 mr-2" />
                                Reset Password
                              </Button>
                              {!user.deleted_at && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => openDeleteDialog('user', user)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Districts Tab */}
              <TabsContent value="districts" className="space-y-4">
                {districts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Search for districts to get started
                  </div>
                ) : (
                  <div className="space-y-2">
                    {districts.map((district) => (
                      <Card key={district.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{district.name}</h3>
                                {district.deleted_at && <Badge variant="destructive">Deleted</Badge>}
                              </div>
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>{district.school_count} Schools</span>
                                <span>{district.user_count} Admins</span>
                                <span>Created: {new Date(district.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {!district.deleted_at && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openDeleteDialog('district', district)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete District
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Schools Tab */}
              <TabsContent value="schools" className="space-y-4">
                {schools.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Search for schools to get started
                  </div>
                ) : (
                  <div className="space-y-2">
                    {schools.map((school) => (
                      <Card key={school.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{school.name}</h3>
                                {school.deleted_at && <Badge variant="destructive">Deleted</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">District: {school.district_name}</p>
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>{school.classroom_count} Classrooms</span>
                                <span>{school.user_count} Admins</span>
                                <span>Created: {new Date(school.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {!school.deleted_at && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openDeleteDialog('school', school)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete School
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Classrooms Tab */}
              <TabsContent value="classrooms" className="space-y-4">
                {classrooms.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Search for classrooms to get started
                  </div>
                ) : (
                  <div className="space-y-2">
                    {classrooms.map((classroom) => (
                      <Card key={classroom.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{classroom.name}</h3>
                                {classroom.deleted_at && <Badge variant="destructive">Deleted</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {classroom.school_name} • {classroom.district_name}
                              </p>
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>Teacher: {classroom.teacher_name}</span>
                                <span>{classroom.student_count} Students</span>
                                <span>Created: {new Date(classroom.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {!classroom.deleted_at && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openDeleteDialog('classroom', classroom)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Classroom
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the {deleteType} and all associated data.
              </DialogDescription>
            </DialogHeader>
            
            {deleteTarget && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    You are about to delete: <strong>{deleteTarget.name || deleteTarget.full_name}</strong>
                  </AlertDescription>
                </Alert>

                {deleteType === 'user' && (
                  <div className="space-y-2">
                    <Label htmlFor="delete-reason">Reason for deletion (required)</Label>
                    <Textarea
                      id="delete-reason"
                      placeholder="Enter the reason for deleting this account..."
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading || (deleteType === 'user' && !deleteReason.trim())}
              >
                {loading ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
