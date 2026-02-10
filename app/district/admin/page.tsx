'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'
import { Building2, Users, BookOpen, Plus, Clock, CheckCircle, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function DistrictAdminPanel() {
  const [user, setUser] = useState<any>(null)
  const [district, setDistrict] = useState<any>(null)
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [classRequests, setClassRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewClass, setShowNewClass] = useState(false)
  const [newClass, setNewClass] = useState({ name: '', description: '', course_id: '' })
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadDistrictData()
  }, [])

  async function loadDistrictData() {
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

      // Get district for this admin
      const { data: districtAdminData } = await supabase
        .from('district_admins')
        .select('district_id, districts(*)')
        .eq('admin_id', authUser.id)
        .single()

      if (!districtAdminData) {
        router.push('/protected')
        return
      }

      setDistrict(districtAdminData.districts)

      // Load classrooms for this district
      const { data: classroomsData } = await supabase
        .from('classrooms')
        .select('*, courses(name)')
        .eq('district_id', districtAdminData.district_id)
        .order('created_at', { ascending: false })

      setClassrooms(classroomsData || [])

      // Load class requests
      const { data: requestsData } = await supabase
        .from('class_requests')
        .select('*')
        .eq('district_id', districtAdminData.district_id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })

      setClassRequests(requestsData || [])
    } catch (err: any) {
      console.error('[v0] Error loading district data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateClassRequest() {
    if (!newClass.name.trim()) return

    setCreating(true)
    const supabase = createClient()

    try {
      // Create classroom with pending activation
      const { data: classroomData, error: classError } = await supabase
        .from('classrooms')
        .insert({
          name: newClass.name,
          description: newClass.description,
          district_id: district.id,
          pending_activation: true,
          is_active: false,
          code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        })
        .select()
        .single()

      if (classError) throw classError

      // Create class request for full admin approval
      await supabase.from('class_requests').insert({
        district_id: district.id,
        classroom_id: classroomData.id,
        requested_by: user.id,
        status: 'pending',
      })

      setShowNewClass(false)
      setNewClass({ name: '', description: '', course_id: '' })
      loadDistrictData()
    } catch (err: any) {
      console.error('[v0] Error creating class request:', err)
      alert('Error creating class request: ' + (err.message || 'Unknown error'))
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-foreground text-base">Loading district panel...</p>
      </div>
    )
  }

  if (!district) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-foreground text-base">No district assigned</p>
      </div>
    )
  }

  const activeClasses = classrooms.filter((c) => c.is_active).length
  const pendingClasses = classrooms.filter((c) => c.pending_activation).length

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">District Admin Panel</h1>
              <p className="text-sm text-muted-foreground font-medium">{district.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                onClick={() => router.push('/protected')}
                variant="ghost"
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* District Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Building2 className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold text-foreground">{classrooms.length}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-medium">Total Classes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-3xl font-bold text-foreground">{activeClasses}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-medium">Active Classes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="text-3xl font-bold text-foreground">{pendingClasses}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-medium">Pending Activation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-3xl font-bold text-foreground">{district.max_students || 0}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-medium">Student Limit</p>
            </CardContent>
          </Card>
        </div>

        {/* Create Class Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Class Management</CardTitle>
                <CardDescription className="text-[15px]">
                  Request new classes for your district (requires full admin approval)
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowNewClass(!showNewClass)}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Request New Class
              </Button>
            </div>
          </CardHeader>
          {showNewClass && (
            <CardContent className="space-y-4 border-t border-border pt-6">
              <div>
                <Label htmlFor="name">Class Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Introduction to Python"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description..."
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateClassRequest}
                  disabled={creating || !newClass.name.trim()}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white"
                >
                  {creating ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowNewClass(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Classes List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Classes</CardTitle>
            <CardDescription className="text-[15px]">
              Manage classes in your district
            </CardDescription>
          </CardHeader>
          <CardContent>
            {classrooms.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-base">No classes yet. Request a class to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {classrooms.map((classroom) => (
                  <div
                    key={classroom.id}
                    className="p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-foreground">{classroom.name}</h3>
                          {classroom.is_active ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                              Pending
                            </span>
                          )}
                        </div>
                        {classroom.description && (
                          <p className="text-sm text-muted-foreground mt-1">{classroom.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground font-medium">Code: {classroom.code}</span>
                          {classroom.courses && (
                            <span className="text-xs text-muted-foreground font-medium">Course: {classroom.courses.name}</span>
                          )}
                        </div>
                      </div>
                      {classroom.is_active && (
                        <Button
                          onClick={() => router.push(`/teacher/classroom/${classroom.id}`)}
                          variant="secondary"
                        >
                          Manage
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
