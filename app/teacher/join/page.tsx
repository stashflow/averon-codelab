'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, CheckCircle, Clock, XCircle, Send } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface ClassroomInfo {
  id: string
  name: string
  description: string
  code: string
  max_teachers: number
  max_students: number
}

interface Request {
  id: string
  classroom_id: string
  status: string
  requested_at: string
  classroom_name?: string
}

export default function TeacherJoinPage() {
  const [user, setUser] = useState<any>(null)
  const [classCode, setClassCode] = useState('')
  const [classroom, setClassroom] = useState<ClassroomInfo | null>(null)
  const [myRequests, setMyRequests] = useState<Request[]>([])
  const [searching, setSearching] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadData()
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single()

      if (profile?.role !== 'teacher') {
        router.push('/protected')
        return
      }

      // Load user's teacher requests
      const { data: requestsData } = await supabase
        .from('teacher_requests')
        .select(
          `
          *,
          classrooms(name)
        `
        )
        .eq('teacher_id', authUser.id)
        .order('requested_at', { ascending: false })

      if (requestsData) {
        const formatted = requestsData.map((req: any) => ({
          id: req.id,
          classroom_id: req.classroom_id,
          status: req.status,
          requested_at: req.requested_at,
          classroom_name: req.classrooms?.name,
        }))
        setMyRequests(formatted)
      }
    } catch (err: any) {
      console.error('[v0] Error loading data:', err)
    }
  }

  async function handleSearchCode() {
    if (!classCode.trim() || !user) return

    setSearching(true)
    setError(null)
    setClassroom(null)

    const supabase = createClient()

    try {
      const { data, error: searchError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('code', classCode.trim().toUpperCase())
        .eq('created_by_admin', true)
        .eq('is_active', true)
        .single()

      if (searchError || !data) {
        setError('Class code not found or inactive')
        return
      }

      // Check if already requested
      const { data: existingRequest } = await supabase
        .from('teacher_requests')
        .select('id, status')
        .eq('classroom_id', data.id)
        .eq('teacher_id', user.id)
        .single()

      if (existingRequest) {
        setError(`You already have a ${existingRequest.status} request for this class`)
        return
      }

      setClassroom(data)
    } catch (err: any) {
      setError('Error searching for class')
    } finally {
      setSearching(false)
    }
  }

  async function handleRequestAccess() {
    if (!classroom) return

    setRequesting(true)
    const supabase = createClient()

    try {
      const { error: insertError } = await supabase.from('teacher_requests').insert({
        classroom_id: classroom.id,
        teacher_id: user.id,
        status: 'pending',
      })

      if (insertError) throw insertError

      alert('Request submitted! An admin will review your request shortly.')
      setClassroom(null)
      setClassCode('')
      loadData()
    } catch (err: any) {
      alert('Error submitting request: ' + (err.message || 'Unknown error'))
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/protected/teacher">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Image src="/ACL.png" alt="ACL Logo" width={40} height={40} className="w-10 h-10 logo-theme-filter" />
                <div>
                  <h1 className="text-xl font-bold text-foreground">Join a Class</h1>
                  <p className="text-sm text-muted-foreground">Enter a class code to request access</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search for Class Code */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle className="text-primary">Enter Class Code</CardTitle>
            <CardDescription>Get the class code from your administrator to request access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="classCode">Class Code</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="classCode"
                    placeholder="Enter 8-character code"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="font-mono text-lg uppercase"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchCode()}
                  />
                  <Button onClick={handleSearchCode} disabled={searching || !classCode.trim()} className="bg-primary hover:bg-primary/90">
                    {searching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>
              )}

              {classroom && (
                <div className="p-6 border-2 border-primary/20 rounded-lg bg-primary/5 space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{classroom.name}</h3>
                    {classroom.description && <p className="text-muted-foreground">{classroom.description}</p>}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>Max Teachers: {classroom.max_teachers}</span>
                    <span>Max Students: {classroom.max_students}</span>
                  </div>
                  <Button onClick={handleRequestAccess} disabled={requesting} className="w-full bg-primary hover:bg-primary/90 gap-2">
                    <Send className="w-4 h-4" />
                    {requesting ? 'Requesting...' : 'Request Access'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Requests */}
        {myRequests.length > 0 && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-primary">My Requests</CardTitle>
              <CardDescription>Track the status of your class access requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myRequests.map((request) => (
                  <div key={request.id} className="p-4 border-2 border-border rounded-lg bg-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{request.classroom_name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Requested {new Date(request.requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        {request.status === 'pending' && (
                          <span className="flex items-center gap-2 px-3 py-1 text-sm font-medium bg-orange-100 text-orange-700 rounded-full dark:bg-orange-950 dark:text-orange-400">
                            <Clock className="w-4 h-4" />
                            Pending
                          </span>
                        )}
                        {request.status === 'approved' && (
                          <span className="flex items-center gap-2 px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full dark:bg-green-950 dark:text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            Approved
                          </span>
                        )}
                        {request.status === 'rejected' && (
                          <span className="flex items-center gap-2 px-3 py-1 text-sm font-medium bg-red-100 text-red-700 rounded-full dark:bg-red-950 dark:text-red-400">
                            <XCircle className="w-4 h-4" />
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
