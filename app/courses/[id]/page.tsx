'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, BookOpen, CheckCircle2, Lock, Play } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface Lesson {
  order_index: number
  duration_minutes?: number | null
}

export const dynamic = 'force-dynamic'

function repairInlineMarkdown(input: string): string {
  let source = String(input || '').replace(/\r\n/g, '\n')
  if (!source.trim()) return ''

  source = source.replace(/\s+(#{1,6}\s)/g, '\n\n$1')
  source = source.replace(/([^\n])(\s+```[a-zA-Z0-9_-]*)/g, '$1\n\n$2')
  source = source.replace(/([^\n])(\s+-\s(?:\*\*|Q:))/g, '$1\n$2')
  source = source.replace(/([^\n])(\s+\d+\.\s)/g, '$1\n$2')
  source = source.replace(/```[ \t]*(#{1,6}\s)/g, '```\n\n$1')
  source = source.replace(/[ \t]+\n/g, '\n')
  source = source.replace(/\n{3,}/g, '\n\n')

  return source.trim()
}

function normalizeMarkdown(raw: string | null | undefined): string {
  const source = String(raw || '').trim()
  if (!source) return ''
  const unescaped = source.includes('\\n') ? source.replace(/\\n/g, '\n') : source
  if (!unescaped.startsWith('{') && !unescaped.startsWith('[')) return repairInlineMarkdown(unescaped)

  try {
    const parsed = JSON.parse(unescaped) as any
    if (typeof parsed === 'string') return repairInlineMarkdown(parsed)
    if (!parsed || typeof parsed !== 'object') return repairInlineMarkdown(unescaped)

    if (typeof parsed.markdown === 'string') return repairInlineMarkdown(parsed.markdown)
    if (typeof parsed.description_markdown === 'string') return repairInlineMarkdown(parsed.description_markdown)
    if (typeof parsed.content_markdown === 'string') return repairInlineMarkdown(parsed.content_markdown)
    if (typeof parsed.description === 'string') return repairInlineMarkdown(parsed.description)

    const chunks: string[] = []
    if (typeof parsed.title === 'string') chunks.push(`# ${parsed.title}`)
    if (typeof parsed.summary === 'string') chunks.push(parsed.summary)
    if (Array.isArray(parsed.learning_objectives) && parsed.learning_objectives.length > 0) {
      chunks.push('## Learning Objectives')
      parsed.learning_objectives.forEach((objective: unknown) => chunks.push(`- ${String(objective)}`))
    }
    if (Array.isArray(parsed.hints) && parsed.hints.length > 0) {
      chunks.push('## Notes')
      parsed.hints.forEach((hint: unknown) => chunks.push(`- ${String(hint)}`))
    }

    const output = chunks.join('\n\n').trim()
    return repairInlineMarkdown(output || unescaped)
  } catch {
    return repairInlineMarkdown(unescaped)
  }
}

export default function CourseDetailPage() {
  const [course, setCourse] = useState<any>(null)
  const [units, setUnits] = useState<any[]>([])
  const [progress, setProgress] = useState<Map<string, any>>(new Map())
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string

  useEffect(() => {
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

        // Load course
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single()

        if (courseError) throw courseError
        setCourse(courseData)

        // Load units and lessons
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select(`
            *,
            lessons:lessons(*)
          `)
          .eq('course_id', courseId)
          .order('order_index')

        if (unitsError) throw unitsError

        // Sort lessons within each unit
        const sortedUnits = (unitsData || []).map((unit: any) => ({
          ...unit,
          lessons: (unit.lessons || []).sort((a: Lesson, b: Lesson) => a.order_index - b.order_index),
        }))

        setUnits(sortedUnits)

        // Load student progress
        const { data: progressData } = await supabase
          .from('student_lesson_progress')
          .select('*')
          .eq('student_id', user.id)

        const progressMap = new Map()
        progressData?.forEach((p: any) => {
          progressMap.set(p.lesson_id, p)
        })
        setProgress(progressMap)
      } catch (err: any) {
        console.error('[v0] Load course error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [courseId, router])

  const calculateCourseProgress = () => {
    let total = 0
    let completed = 0

    units.forEach((unit) => {
      unit.lessons?.forEach((lesson: any) => {
        total++
        const lessonProgress = progress.get(lesson.id)
        if (lessonProgress?.status === 'completed') {
          completed++
        }
      })
    })

    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const getLessonStatus = (lessonId: string) => {
    const lessonProgress = progress.get(lessonId)
    if (!lessonProgress) return 'not_started'
    return lessonProgress.status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />
      case 'in_progress':
        return <Play className="w-5 h-5 text-cyan-400" />
      default:
        return <Lock className="w-5 h-5 text-white/50" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/60">Loading course...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white/60 mb-4">Course not found</div>
          <Link href="/courses">
            <Button variant="outline" className="border-white/10 text-white/60 hover:text-white hover:bg-white/5 bg-transparent">
              Back to Courses
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const progressPercent = calculateCourseProgress()
  const isApcspCourse = /ap computer science principles|ap csp/i.test(String(course?.name || ''))
  const firstLessonId =
    units
      .flatMap((unit) => unit.lessons || [])
      .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))[0]?.id || null

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
            <Link href="/courses">
              <Button variant="outline" className="border-white/10 text-white/60 hover:text-white hover:bg-white/5 bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                All Courses
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Course Header */}
      <section className="relative border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
          <div className="flex items-start gap-8">
            <div className={`w-24 h-24 rounded-3xl bg-gradient-to-r ${course.color || 'from-cyan-500 to-blue-500'} flex items-center justify-center flex-shrink-0`}>
              <BookOpen className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 border mb-4">
                {course.difficulty_level}
              </Badge>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-200 to-blue-200 bg-clip-text text-transparent">
                {course.name}
              </h1>
              <div className="text-xl text-white/70 font-light mb-6 [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-500/50 [&_blockquote]:bg-cyan-500/10 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_code]:rounded [&_code]:bg-slate-900 [&_code]:px-1 [&_code]:py-0.5 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-8 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-slate-700 [&_pre]:bg-slate-950 [&_pre]:p-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-700 [&_td]:p-2 [&_th]:border [&_th]:border-slate-700 [&_th]:bg-slate-900 [&_th]:p-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {normalizeMarkdown(course.description)}
                </ReactMarkdown>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/50">
                <BookOpen className="w-4 h-4" />
                <span>{units.length} units</span>
              </div>
            </div>
          </div>

          {progressPercent > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Your Progress</span>
                <span className="text-white font-semibold">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          {isApcspCourse && firstLessonId && (
            <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
              <p className="text-sm font-semibold text-cyan-200">Start Here</p>
              <p className="text-sm text-cyan-100 mt-1">Open Lesson 1.0 course intro notes before Lesson 1.1.</p>
              <Link href={`/lesson/${firstLessonId}?view=course-intro`}>
                <Button className="mt-3 bg-cyan-500 text-slate-950 hover:bg-cyan-400">Open 1.0 Course Intro</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Units and Lessons */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="space-y-8">
          {units.map((unit, unitIndex) => (
            <Card
              key={unit.id}
              className="border-2 border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-sm"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-cyan-400 text-sm font-semibold mb-2">Unit {unitIndex + 1}</div>
                    <CardTitle className="text-white text-2xl mb-2">{unit.title}</CardTitle>
                    <CardDescription className="text-white/70 [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-500/40 [&_blockquote]:bg-cyan-500/10 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_code]:rounded [&_code]:bg-slate-900 [&_code]:px-1 [&_code]:py-0.5 [&_li]:ml-5 [&_li]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-slate-700 [&_pre]:bg-slate-950 [&_pre]:p-3">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {normalizeMarkdown(unit.description)}
                      </ReactMarkdown>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {unit.lessons?.map((lesson: any, lessonIndex: number) => {
                    const status = getLessonStatus(lesson.id)
                    return (
                      <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
                        <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-cyan-500/50 hover:bg-white/5 transition-all cursor-pointer group">
                          <div className="flex-shrink-0">{getStatusIcon(status)}</div>
                          <div className="flex-1">
                            <div className="text-white font-semibold group-hover:text-cyan-300 transition-colors">
                              {lessonIndex + 1}. {lesson.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {lesson.duration_minutes ? `${lesson.duration_minutes} min` : '45 min'} · Notes + Checkpoint
                            </div>
                          </div>
                          {status === 'completed' && (
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 border">
                              Completed
                            </Badge>
                          )}
                        </div>
                      </Link>
                    )
                  })}

                  {(!unit.lessons || unit.lessons.length === 0) && (
                    <div className="text-center py-8 text-white/70 text-base">No lessons available yet</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {units.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-white/60" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Course Content Coming Soon</h3>
              <p className="text-white/60">Units and lessons will be added soon.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
