'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardDescription } from "@/components/ui/card"
import { CardContent } from "@/components/ui/card"
import { CardTitle } from "@/components/ui/card"
import { CardHeader } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { LogOut, BarChart3, Users, BookOpen, Settings } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AdminPanel() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ users: 0, teachers: 0, students: 0, classrooms: 0, assignments: 0 })
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const checkAdminAndLoadStats = async () => {
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

        // Check if user is admin
        const { data: profileData } = await supabase.from('profiles').select('role').eq('id', authUser.id).single()

        if (profileData?.role !== 'admin') {
          router.push('/protected')
          return
        }

        setProfile(profileData)

        // Load statistics
        const [usersRes, classroomsRes, assignmentsRes] = await Promise.all([
          supabase.from('profiles').select('id, role'),
          supabase.from('classrooms').select('id'),
          supabase.from('assignments').select('id'),
        ])

        const allUsers = usersRes.data || []
        const teachers = allUsers.filter((u) => u.role === 'teacher').length
        const students = allUsers.filter((u) => u.role === 'student').length

        setStats({
          users: allUsers.length,
          teachers,
          students,
          classrooms: classroomsRes.data?.length || 0,
          assignments: assignmentsRes.data?.length || 0,
        })
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (mounted) {
      checkAdminAndLoadStats()
    }
  }, [mounted, router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Access denied. Admin access required.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">System Administration & Analytics</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="gap-2 bg-transparent">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 border-b border-border">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('overview')}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Overview
          </Button>
          <Button
            variant={activeTab === 'users' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('users')}
            className="gap-2"
          >
            <Users className="w-4 h-4" />
            Users
          </Button>
          <Button
            variant={activeTab === 'problems' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('problems')}
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Problems
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('settings')}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-secondary">System Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{stats.users}</p>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Teachers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-secondary">{stats.teachers}</p>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-secondary">{stats.students}</p>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Classrooms</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{stats.classrooms}</p>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{stats.assignments}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Platform Health</CardTitle>
                <CardDescription>System status and performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                  <span className="text-sm font-medium text-green-900">Database Connection</span>
                  <span className="text-xs font-semibold text-green-700">HEALTHY</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                  <span className="text-sm font-medium text-green-900">Authentication Service</span>
                  <span className="text-xs font-semibold text-green-700">OPERATIONAL</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                  <span className="text-sm font-medium text-green-900">File Storage</span>
                  <span className="text-xs font-semibold text-green-700">OPERATIONAL</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-secondary">User Management</h2>
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Active Users</CardTitle>
                <CardDescription>Total registered users on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-secondary/5 rounded">
                    <div>
                      <p className="font-medium text-secondary">Student Accounts</p>
                      <p className="text-xs text-muted-foreground">{stats.students} active students</p>
                    </div>
                    <span className="text-lg font-bold text-primary">{stats.students}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/5 rounded">
                    <div>
                      <p className="font-medium text-secondary">Teacher Accounts</p>
                      <p className="text-xs text-muted-foreground">{stats.teachers} active teachers</p>
                    </div>
                    <span className="text-lg font-bold text-primary">{stats.teachers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Problems Tab */}
        {activeTab === 'problems' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-secondary">Problem Management</h2>
              <Button className="bg-primary hover:bg-primary/90">Create Problem Repository</Button>
            </div>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Problem Library</CardTitle>
                <CardDescription>Manage reusable coding problems</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 border border-primary/20 rounded-lg bg-primary/5">
                    <p className="font-medium text-secondary">Problem Categories</p>
                    <p className="text-sm text-muted-foreground mt-1">Create and organize coding problems by difficulty, topic, and language</p>
                  </div>
                  <div className="p-4 border border-primary/20 rounded-lg bg-primary/5">
                    <p className="font-medium text-secondary">Test Case Management</p>
                    <p className="text-sm text-muted-foreground mt-1">Define test cases and validation criteria for problems</p>
                  </div>
                  <div className="p-4 border border-primary/20 rounded-lg bg-primary/5">
                    <p className="font-medium text-secondary">Solution Templates</p>
                    <p className="text-sm text-muted-foreground mt-1">Create starter code templates for different languages</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-secondary">System Settings</h2>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input id="platformName" defaultValue="Averon CodeLab" disabled />
                </div>
                <div>
                  <Label htmlFor="maxFileSize">Max Upload Size</Label>
                  <Input id="maxFileSize" defaultValue="50MB" disabled />
                </div>
                <div>
                  <Label htmlFor="sessionTimeout">Session Timeout</Label>
                  <Input id="sessionTimeout" defaultValue="24 hours" disabled />
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-secondary/5 rounded">
                  <div>
                    <p className="font-medium text-secondary">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">Require 2FA for admin access</p>
                  </div>
                  <input type="checkbox" defaultChecked disabled className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/5 rounded">
                  <div>
                    <p className="font-medium text-secondary">Email Verification</p>
                    <p className="text-xs text-muted-foreground">Require verified email for signup</p>
                  </div>
                  <input type="checkbox" defaultChecked disabled className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
