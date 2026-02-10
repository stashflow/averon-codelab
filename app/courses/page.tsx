'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Code, BookOpen, Clock, Trophy, ArrowRight, LogOut } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function CoursesPage() {
  const [user, setUser] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set())
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

        // Load all courses
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('is_active', true)
          .order('difficulty_level')

        if (coursesError) throw coursesError
        setCourses(coursesData || [])

        // Load student's enrollments
        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('student_id', authUser.id)
          .eq('is_active', true)

        console.log('[v0] Enrollments:', enrollments)
        const enrolledIds = new Set(enrollments?.map((e) => e.course_id) || [])
        setEnrolledCourseIds(enrolledIds)
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

    setEnrolling(courseId)

    try {
      const supabase = createClient()

      console.log('[v0] Enrolling in course:', courseId)

      // Create enrollment
      const { error } = await supabase.from('course_enrollments').insert({
        student_id: user.id,
        course_id: courseId,
        is_active: true,
      })

      if (error) throw error

      console.log('[v0] Enrollment successful')

      // Update local state
      setEnrolledCourseIds(new Set([...enrolledCourseIds, courseId]))

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

  const getCourseIcon = (language: string) => {
    return <Code className="w-6 h-6" />
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
              <Image src="/ACL.png" alt="ACL Logo" width={48} height={48} className="w-12 h-12" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="relative overflow-hidden border-2 border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-sm hover:border-cyan-500/50 transition-all duration-300 group"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${course.color || 'from-cyan-500 to-blue-500'} flex items-center justify-center`}>
                    {getCourseIcon(course.language)}
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

                  {enrolledCourseIds.has(course.id) ? (
                    <Link href={`/courses/${course.id}`}>
                      <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold group-hover:shadow-xl group-hover:shadow-cyan-500/25 transition-all">
                        Continue Learning <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrolling === course.id}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold group-hover:shadow-xl group-hover:shadow-green-500/25 transition-all"
                    >
                      {enrolling === course.id ? 'Enrolling...' : 'Enroll Now'}
                      {enrolling !== course.id && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {courses.length === 0 && (
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
