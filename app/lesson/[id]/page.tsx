'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, CheckCircle, PlayCircle, Code, Trophy, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Checkpoint {
  id: string
  title: string
  problem_description: string
  starter_code: string
  test_cases: any
  points: number
  order_index: number
}

interface Lesson {
  id: string
  title: string
  description: string
  content_body: string
  duration_minutes: number
  unit_id: string
  order_index: number
}

export default function LessonViewer() {
  const params = useParams()
  const lessonId = params?.id as string
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [currentCheckpoint, setCurrentCheckpoint] = useState<Checkpoint | null>(null)
  const [code, setCode] = useState('')
  const [testResults, setTestResults] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadLessonData()
  }, [lessonId])

  async function loadLessonData() {
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

      // Load lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single()

      if (lessonError) throw lessonError
      setLesson(lessonData)

      // Load checkpoints for this lesson
      const { data: checkpointsData, error: checkpointsError } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_index', { ascending: true })

      if (checkpointsError) throw checkpointsError
      setCheckpoints(checkpointsData || [])

      if (checkpointsData && checkpointsData.length > 0) {
        setCurrentCheckpoint(checkpointsData[0])
        setCode(checkpointsData[0].starter_code || '')
      }

      // Load progress
      const { data: progressData } = await supabase
        .from('student_lesson_progress')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('student_id', authUser.id)
        .single()

      setProgress(progressData)
    } catch (err: any) {
      console.error('[v0] Error loading lesson:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRunTests() {
    if (!currentCheckpoint) return

    setSubmitting(true)
    setTestResults(null)

    try {
      // Simulate test execution
      const testCases = currentCheckpoint.test_cases || []
      const results = testCases.map((test: any, index: number) => ({
        id: index,
        passed: Math.random() > 0.3, // Mock: 70% pass rate
        input: test.input,
        expected: test.expected,
        actual: test.expected, // Mock
      }))

      const allPassed = results.every((r: any) => r.passed)
      const score = (results.filter((r: any) => r.passed).length / results.length) * 100

      setTestResults({
        passed: allPassed,
        score,
        results,
      })

      // Save submission
      const supabase = createClient()
      await supabase.from('checkpoint_submissions').insert({
        checkpoint_id: currentCheckpoint.id,
        student_id: user.id,
        code,
        is_correct: allPassed,
        score,
        test_results: results,
      })

      // Update progress if all tests passed
      if (allPassed) {
        await supabase
          .from('student_lesson_progress')
          .upsert({
            lesson_id: lesson?.id,
            student_id: user.id,
            status: 'in_progress',
            last_accessed: new Date().toISOString(),
            score: score,
          })
      }
    } catch (err: any) {
      console.error('[v0] Error running tests:', err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCompleteLesson() {
    const supabase = createClient()

    try {
      await supabase
        .from('student_lesson_progress')
        .upsert({
          lesson_id: lesson?.id,
          student_id: user.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
          last_accessed: new Date().toISOString(),
        })

      router.push('/student/dashboard')
    } catch (err: any) {
      console.error('[v0] Error completing lesson:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white/60">Loading lesson...</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white/60">Lesson not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/student/dashboard">
              <Button variant="ghost" size="sm" className="gap-2 text-white/60 hover:text-white hover:bg-white/5">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">{lesson.title}</h1>
              <p className="text-sm text-white/65 font-medium">{lesson.duration_minutes} minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {checkpoints.map((cp, idx) => (
              <button
                key={cp.id}
                onClick={() => {
                  setCurrentCheckpoint(cp)
                  setCode(cp.starter_code || '')
                  setTestResults(null)
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  currentCheckpoint?.id === cp.id
                    ? 'bg-cyan-500 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Lesson Content */}
          <div className="space-y-6">
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Lesson Content</CardTitle>
                <CardDescription className="text-white/60">{lesson.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none">
                  <p className="text-white/80 leading-relaxed">{lesson.content_body}</p>
                </div>
              </CardContent>
            </Card>

            {currentCheckpoint && (
              <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Code className="w-5 h-5 text-cyan-400" />
                      {currentCheckpoint.title}
                    </CardTitle>
                    <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-sm font-semibold">
                      {currentCheckpoint.points} pts
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                    {currentCheckpoint.problem_description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Code Editor */}
          <div className="space-y-6">
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Code Editor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Write your code here..."
                  className="min-h-[400px] font-mono text-sm bg-black border-white/10 text-white"
                />
                <Button
                  onClick={handleRunTests}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold gap-2"
                >
                  <PlayCircle className="w-4 h-4" />
                  {submitting ? 'Running Tests...' : 'Run Tests'}
                </Button>
              </CardContent>
            </Card>

            {/* Test Results */}
            {testResults && (
              <Card
                className={`border-2 backdrop-blur-sm ${
                  testResults.passed
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-orange-500/50 bg-orange-500/10'
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    {testResults.passed ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        All Tests Passed!
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-orange-400" />
                        Some Tests Failed
                      </>
                    )}
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Score: {testResults.score.toFixed(0)}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {testResults.results.map((result: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          result.passed
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-red-500/10 border-red-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono text-white/80">Test {idx + 1}</span>
                          {result.passed ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {testResults.passed && (
                    <Button
                      onClick={handleCompleteLesson}
                      className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold gap-2"
                    >
                      <Trophy className="w-4 h-4" />
                      Complete Lesson
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
