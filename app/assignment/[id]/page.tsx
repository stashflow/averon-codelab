'use client'

import nextDynamic from 'next/dynamic'
import type { OnMount } from '@monaco-editor/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Send, Play, CheckCircle2, XCircle, Code2, Braces, AlertCircle } from 'lucide-react'
import { withCsrfHeaders } from '@/lib/security/csrf-client'
import type { editor } from 'monaco-editor'

const MonacoEditor = nextDynamic(() => import('@monaco-editor/react'), { ssr: false })

type MonacoLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'cpp' | 'c' | 'json'

type Assignment = {
  id: string
  title: string
  description: string | null
  language: string | null
  due_date: string | null
  classroom_id: string
  starter_code: string | null
}

type Submission = {
  id: string
  code: string
  status: string | null
  score: number | null
  feedback: string | null
}

type JudgeResult = {
  passed: boolean
  name?: string
  expected?: string
  actual?: string
  error?: string | null
}

type JudgePayload = {
  passed: boolean
  score: number
  results: JudgeResult[]
}

function resolveMonacoLanguage(language: string | null | undefined): MonacoLanguage {
  switch ((language || '').toLowerCase()) {
    case 'javascript':
      return 'javascript'
    case 'typescript':
      return 'typescript'
    case 'java':
      return 'java'
    case 'cpp':
    case 'c++':
      return 'cpp'
    case 'c':
      return 'c'
    case 'json':
      return 'json'
    case 'python':
    default:
      return 'python'
  }
}

function normalizeMarkdown(raw: string | null | undefined): string {
  const source = String(raw || '').trim()
  if (!source) return 'No description provided.'
  const unescaped = source.includes('\\n') ? source.replace(/\\n/g, '\n') : source
  if (!unescaped.startsWith('{') && !unescaped.startsWith('[')) return unescaped

  try {
    const parsed = JSON.parse(unescaped) as any
    if (typeof parsed === 'string') return parsed
    if (!parsed || typeof parsed !== 'object') return unescaped
    if (typeof parsed.markdown === 'string') return parsed.markdown
    if (typeof parsed.description === 'string') return parsed.description
    if (typeof parsed.content_markdown === 'string') return parsed.content_markdown
    if (typeof parsed.feedback === 'string') return parsed.feedback
    return unescaped
  } catch {
    return unescaped
  }
}

export const dynamic = 'force-dynamic'

export default function AssignmentPage() {
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [code, setCode] = useState('')
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [testingCode, setTestingCode] = useState(false)
  const [testResults, setTestResults] = useState<JudgePayload | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [editorLanguage, setEditorLanguage] = useState<MonacoLanguage>('python')

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId])

  const assignmentMarkdown = useMemo(() => normalizeMarkdown(assignment?.description), [assignment?.description])
  const feedbackMarkdown = useMemo(() => normalizeMarkdown(submission?.feedback), [submission?.feedback])

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

      setUserId(authUser.id)

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', authUser.id).single()
      if (profile?.role !== 'student') {
        router.push('/protected')
        return
      }

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .single()

      if (assignmentError) throw assignmentError

      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('classroom_id', assignmentData.classroom_id)
        .eq('student_id', authUser.id)
        .maybeSingle()

      if (!enrollment) {
        router.push('/student/dashboard')
        return
      }

      const normalizedAssignment = assignmentData as Assignment
      setAssignment(normalizedAssignment)
      setEditorLanguage(resolveMonacoLanguage(normalizedAssignment.language))
      setCode(normalizedAssignment.starter_code || '')

      const { data: submissionData, error: submissionError } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', authUser.id)
        .single()

      if (submissionError && submissionError.code !== 'PGRST116') {
        throw submissionError
      }

      if (submissionData) {
        const normalizedSubmission = submissionData as Submission
        setSubmission(normalizedSubmission)
        setCode(normalizedSubmission.code || normalizedAssignment.starter_code || '')
      }
    } catch (err: any) {
      console.error('[v0] Error loading assignment page data:', err)
      alert(err?.message || 'Unable to load assignment.')
    } finally {
      setLoading(false)
    }
  }

  const onEditorMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance
  }

  async function handleRunTests() {
    if (!code.trim()) return

    setTestingCode(true)
    setTestResults(null)
    try {
      const response = await fetch('/api/judge/assignment', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          assignmentId,
          code,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to run tests')
      }

      const resultList = Array.isArray(payload?.results)
        ? payload.results
        : (Array.isArray(payload?.tests) ? payload.tests : [])

      const passedFromPayload =
        typeof payload?.passed === 'boolean'
          ? payload.passed
          : (typeof payload?.passedCount === 'number' && typeof payload?.total === 'number'
            ? payload.passedCount === payload.total
            : false)

      setTestResults({
        passed: passedFromPayload,
        score: Number(payload?.score || 0),
        results: resultList,
      })
    } catch (err: any) {
      alert(err?.message || 'Unable to run tests')
    } finally {
      setTestingCode(false)
    }
  }

  async function handleSubmit() {
    if (!code.trim() || !userId) return

    setSubmitting(true)
    const supabase = createClient()

    try {
      if (submission) {
        const { error } = await supabase
          .from('submissions')
          .update({
            code,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .eq('id', submission.id)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('submissions')
          .insert({
            assignment_id: assignmentId,
            student_id: userId,
            code,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .select()

        if (error) throw error
        setSubmission(data?.[0] || null)
      }

      alert('Submission successful. Your teacher can now review it.')
    } catch (err: any) {
      alert('Error submitting: ' + (err.message || 'Unknown error'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFormatCode() {
    const action = editorRef.current?.getAction('editor.action.formatDocument')
    if (action) {
      await action.run()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <p className="text-slate-300">Loading assignment...</p>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <p className="text-slate-300">Assignment not found.</p>
      </div>
    )
  }

  const passedCount = testResults?.results.filter((result) => result.passed).length || 0
  const totalCount = testResults?.results.length || 0
  const displayLanguage = assignment.language
    ? `${assignment.language.charAt(0).toUpperCase()}${assignment.language.slice(1)}`
    : 'Unknown'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-200 hover:text-white hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white truncate">{assignment.title}</h1>
              <p className="text-sm text-slate-400">
                {displayLanguage}
                {assignment.due_date && ` • Due: ${new Date(assignment.due_date).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          {submission?.status === 'graded' && (
            <div className="text-right">
              <p className="text-sm text-slate-400">Score</p>
              <p className="text-2xl font-bold text-cyan-300">{submission.score ?? 0}%</p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-4">
            <div className="rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl p-6 sticky top-24 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Assignment</h3>
                <div className="space-y-3 text-slate-200 text-sm [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-6 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-slate-700 [&_pre]:bg-slate-950 [&_pre]:p-3 [&_code]:rounded [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:py-0.5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{assignmentMarkdown}</ReactMarkdown>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-400 mb-1">Status</p>
                <Badge className="bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                  {submission?.status === 'graded'
                    ? 'Graded'
                    : submission?.status === 'submitted'
                      ? 'Submitted'
                      : 'Not Submitted'}
                </Badge>
              </div>

              {submission?.feedback && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">Teacher Feedback</p>
                  <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200 [&_p]:leading-6">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{feedbackMarkdown}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="lg:col-span-8">
            <div className="rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-cyan-300" />
                  Code Editor
                </h3>
                <div className="flex items-center gap-2">
                  <Badge className="border-slate-700 bg-slate-900 text-slate-200">{editorLanguage}</Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                    onClick={handleFormatCode}
                  >
                    <Braces className="mr-1 h-4 w-4" />
                    Format
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                    onClick={() => setCode(assignment.starter_code || '')}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-700">
                <MonacoEditor
                  height="460px"
                  language={editorLanguage}
                  value={code}
                  onMount={onEditorMount}
                  onChange={(value) => setCode(value ?? '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    formatOnType: true,
                    formatOnPaste: true,
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleRunTests}
                  variant="outline"
                  className="gap-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  disabled={testingCode || !code.trim()}
                >
                  <Play className="w-4 h-4" />
                  {testingCode ? 'Running Tests...' : 'Run Tests'}
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-0 gap-2"
                  disabled={submitting || !code.trim()}
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting...' : 'Submit Solution'}
                </Button>
              </div>

              {testResults && (
                <div className={`rounded-xl border p-4 ${testResults.passed ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-orange-500/40 bg-orange-500/10'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-semibold text-white">Test Results</h4>
                    <p className="text-cyan-200 font-semibold">Score: {Math.round(testResults.score)}%</p>
                  </div>
                  <p className="text-sm text-slate-200 mb-3">
                    {passedCount} of {totalCount} tests passed
                  </p>
                  <div className="space-y-2">
                    {testResults.results.map((test, idx) => (
                      <div key={`${idx}-${test.name || 'test'}`} className="flex items-start gap-3 rounded-md border border-slate-700 bg-slate-950/60 p-3">
                        <div className="mt-0.5">
                          {test.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-sm">
                          <p className="font-medium text-white">{test.name || `Test ${idx + 1}`}</p>
                          {!test.passed && (
                            <div className="text-slate-300 mt-1 space-y-1">
                              {test.expected !== undefined && <p>Expected: <span className="font-mono text-slate-100">{test.expected}</span></p>}
                              {test.actual !== undefined && <p>Actual: <span className="font-mono text-slate-100">{test.actual}</span></p>}
                              {test.error && (
                                <p className="text-red-300 flex items-start gap-1">
                                  <AlertCircle className="w-4 h-4 mt-0.5" />
                                  <span>{test.error}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {submission?.status === 'graded' && (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-lg">
                  <p className="text-emerald-200 font-medium">Submission graded: {submission.score ?? 0}%</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
