'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Code, BookOpen, Clock, Users, ArrowRight, LogOut, Lock, GraduationCap, Database, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const dynamic = 'force-dynamic'

interface CourseCategory {
  id: string
  name: string
  slug: string
  description: string
  category_type: string
  icon_name: string
  color: string
  order_index: number
}

interface Course {
  id: string
  name: string
  description: string
  language: string
  level: string
  difficulty_level: string
  estimated_hours: number
  icon_name: string
  color: string
  category_id: string
  requires_payment: boolean
  requires_classroom_enrollment: boolean
}

interface Enrollment {
  course_id: string
  payment_status: string
  status: string
  progress_percentage: number
}

export default function CoursesPage() {
  const [user, setUser] = useState<any>(null)
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [coursesByCategory, setCoursesByCategory] = useState<Record<string, Course[]>>({})
  const [enrollments, setEnrollments] = useState<Map<string, Enrollment>>(new Map())
  const [hasClassroomEnrollment, setHasClassroomEnrollment] = useState(false)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
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

        // Check if student is enrolled in any classroom
        const { data: classroomEnrollments } = await supabase
          .from('enrollments')
          .select('id')
          .eq('student_id', authUser.id)
          .limit(1)

        const hasClassroom = (classroomEnrollments?.length || 0) > 0
        setHasClassroomEnrollment(hasClassroom)

        // Load course categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('course_categories')
          .select('*')
          .eq('is_active', true)
          .order('order_index')

        if (categoriesError) throw categoriesError
        setCategories(categoriesData || [])

        // Load all courses with category info
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('is_active', true)
          .order('difficulty_level')

        if (coursesError) throw coursesError

        // Group courses by category
        const grouped = (coursesData || []).reduce((acc: Record<string, Course[]>, course: Course) => {
          const categoryId = course.category_id || 'uncategorized'
          if (!acc[categoryId]) {
            acc[categoryId] = []
          }
          acc[categoryId].push(course)
          return acc
        }, {})
        setCoursesByCategory(grouped)

        // Load student's course enrollments
        const { data: enrollmentsData } = await supabase
          .from('course_enrollments')
          .select('course_id, payment_status, status, progress_percentage')
          .eq('student_id', authUser.id)
          .eq('is_active', true)

        const enrollmentMap = new Map<string, Enrollment>()
        enrollmentsData?.forEach((e: Enrollment) => {
          enrollmentMap.set(e.course_id, e)
        })
        setEnrollments(enrollmentMap)
      } catch (err: any) {
        console.error('[v0] Load courses error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  async function handleEnroll(courseId: string) {
    if (!user) return

    // Check classroom enrollment requirement
    if (!hasClassroomEnrollment) {
      alert('You must be enrolled in at least one classroom to access courses. Please join a classroom first.')
      return
    }

    setEnrolling(courseId)

    try {
      const supabase = createClient()

      // In production, this would trigger payment flow
      // For now, we'll create enrollment with 'paid' status
      // TODO: Integrate Stripe payment

      const { error } = await supabase.from('course_enrollments').insert({
        student_id: user.id,
        course_id: courseId,
        is_active: true,
        payment_status: 'paid', // In production: 'pending' until payment
        status: 'active',
        enrollment_source: 'direct',
        started_at: new Date().toISOString(),
      })

      if (error) throw error

      // Update local state
      const newEnrollment: Enrollment = {
        course_id: courseId,
        payment_status: 'paid',
        status: 'active',
        progress_percentage: 0
      }
      setEnrollments(new Map(enrollments.set(courseId, newEnrollment)))

      // Redirect to course
      router.push(`/courses/${courseId}`)
    } catch (err: any) {
      console.error('[v0] Error enrolling:', err)
      alert('Failed to enroll in course: ' + err.message)
    } finally {
      setEnrolling(null)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const getCourseIcon = (iconName?: string) => {
    switch (iconName) {
      case 'GraduationCap':
        return <GraduationCap className="w-6 h-6" />
      case 'Database':
        return <Database className="w-6 h-6" />
      case 'Users':
        return <Users className="w-6 h-6" />
      case 'BookOpen':
        return <BookOpen className="w-6 h-6" />
      default:
        return <Code className="w-6 h-6" />
    }
  }

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users':
        return <Users className="w-5 h-5" />
      case 'BookOpen':
      default:
        return <BookOpen className="w-5 h-5" />
    }
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'intermediate':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'advanced':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const canAccessCourse = (courseId: string) => {
    const enrollment = enrollments.get(courseId)
    if (!enrollment) return false
    return ['paid', 'free', 'trial'].includes(enrollment.payment_status) && enrollment.status === 'active'
  }

  const isEnrolled = (courseId: string) => {
    return enrollments.has(courseId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/60">Loading courses...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/ACL.png" alt="ACL Logo" width={48} height={48} className="w-12 h-12 logo-theme-filter" />
              <span className="font-bold text-2xl bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                Averon CodeLab
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-white/60 text-sm">{user?.email}</span>
              <Button 
                onClick={handleSignOut}
                variant="outline"
                className="border-white/10 text-white/60 hover:text-white hover:bg-white/5 bg-transparent"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-200 to-blue-200 bg-clip-text text-transparent">
            Choose Your Course
          </h1>
          <p className="text-xl text-white/60 font-light">
            Start learning with our comprehensive programming courses
          </p>
        </div>

        {!hasClassroomEnrollment && (
          <Alert className="mb-8 border-yellow-500/20 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-200">
              You need to join a classroom before enrolling in courses. Please contact your teacher for a class code.
            </AlertDescription>
          </Alert>
        )}

        {categories.map((category) => {
          const categoryCourses = coursesByCategory[category.id] || []
          if (categoryCourses.length === 0) return null

          return (
            <div key={category.id} className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl bg-${category.color}-500/10 flex items-center justify-center`}>
                  {getCategoryIcon(category.icon_name)}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">{category.name}</h2>
                  <p className="text-white/60 mt-1">{category.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categoryCourses.map((course) => {
                  const enrolled = isEnrolled(course.id)
                  const hasAccess = canAccessCourse(course.id)
                  const enrollment = enrollments.get(course.id)

                  return (
                    <Card
                      key={course.id}
                      className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-sm hover:border-cyan-500/50 transition-all duration-300 group"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${course.color || 'from-cyan-500 to-blue-500'} flex items-center justify-center`}>
                            {getCourseIcon(course.icon_name)}
                          </div>
                          <Badge className={`${getDifficultyColor(course.difficulty_level)} border`}>
                            {course.difficulty_level}
                          </Badge>
                        </div>
                        <CardTitle className="text-white text-3xl mb-2">{course.name}</CardTitle>
                        <CardDescription className="text-white/60 text-base leading-relaxed">
                          {course.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-6 text-sm text-white/50">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{course.estimated_hours || 30} hours</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              <span>{course.language}</span>
                            </div>
                          </div>

                          {enrolled && enrollment && (
                            <div className="text-sm text-white/60">
                              Progress: {enrollment.progress_percentage.toFixed(0)}%
                              <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                  style={{ width: `${enrollment.progress_percentage}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {hasAccess ? (
                            <Link href={`/courses/${course.id}`}>
                              <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold group-hover:shadow-xl group-hover:shadow-cyan-500/25 transition-all">
                                Continue Learning <ArrowRight className="w-4 h-4 ml-2" />
                              </Button>
                            </Link>
                          ) : course.requires_payment ? (
                            <Button
                              onClick={() => handleEnroll(course.id)}
                              disabled={enrolling === course.id || !hasClassroomEnrollment}
                              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold group-hover:shadow-xl group-hover:shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {enrolling === course.id ? 'Enrolling...' : (
                                <>
                                  <Lock className="w-4 h-4 mr-2" />
                                  Enroll Now (Payment Required)
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleEnroll(course.id)}
                              disabled={enrolling === course.id || !hasClassroomEnrollment}
                              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold group-hover:shadow-xl group-hover:shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {enrolling === course.id ? 'Enrolling...' : 'Enroll Now'}
                              {enrolling !== course.id && <ArrowRight className="w-4 h-4 ml-2" />}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}

        {categories.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-white/60" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Courses Available</h3>
            <p className="text-white/60">Courses will be added by your administrator soon.</p>
          </div>
        )}
      </main>
    </div>
  )
}
