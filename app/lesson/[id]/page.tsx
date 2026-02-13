'use client'

import nextDynamic from 'next/dynamic'
import type { OnMount } from '@monaco-editor/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle, PlayCircle, Trophy, AlertCircle, Code2, Braces, FileCode2 } from 'lucide-react'
import { withCsrfHeaders } from '@/lib/security/csrf-client'
import type { editor } from 'monaco-editor'

const MonacoEditor = nextDynamic(() => import('@monaco-editor/react'), { ssr: false })

type MonacoLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'cpp' | 'c' | 'json'

type Checkpoint = {
  id: string
  title: string
  problem_description: string
  starter_code: string
  test_cases: unknown
  points: number
  order_index: number
}

type Lesson = {
  id: string
  title: string
  description: string
  content_body: string
  unit_id: string
}

type MarkdownSection = {
  title: string
  body: string
}

type StaticIssue = {
  severity: 'warning' | 'error'
  message: string
}

const LANGUAGE_OPTIONS: Array<{ value: MonacoLanguage; label: string }> = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'json', label: 'JSON' },
]

const LEARNING_METHODS = [
  {
    title: 'Spaced Repetition',
    prompt: 'Restate one concept from the previous lesson before writing code.',
  },
  {
    title: 'Active Recall',
    prompt: 'Predict output for one test case before running the checker.',
  },
  {
    title: 'Interleaving',
    prompt: 'Connect this task to a concept from a different unit.',
  },
  {
    title: 'Deliberate Practice',
    prompt: 'Revise one part of your solution after feedback to improve clarity.',
  },
]

function stripHtmlTags(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function normalizeLessonMarkdown(raw: string): string {
  const source = (raw || '').trim()
  if (!source) return ''

  // Handle content stored with escaped line breaks.
  const unescaped = source.includes('\\n') ? source.replace(/\\n/g, '\n') : source
  const startsLikeJson = unescaped.startsWith('{') || unescaped.startsWith('[')
  if (!startsLikeJson) return unescaped

  try {
    const parsed = JSON.parse(unescaped) as any
    if (typeof parsed === 'string') return parsed
    if (!parsed || typeof parsed !== 'object') return unescaped

    if (typeof parsed.markdown === 'string') return parsed.markdown
    if (typeof parsed.content_markdown === 'string') return parsed.content_markdown
    if (typeof parsed.content_body === 'string') return parsed.content_body

    const chunks: string[] = []
    if (typeof parsed.challenge_title === 'string') {
      chunks.push(`# ${parsed.challenge_title}`)
    } else if (typeof parsed.title === 'string') {
      chunks.push(`# ${parsed.title}`)
    }
    if (typeof parsed.description === 'string') {
      chunks.push(parsed.description)
    }

    if (Array.isArray(parsed.stages)) {
      parsed.stages.forEach((stage: any, index: number) => {
        const stageTitle = stage?.title || `Stage ${index + 1}`
        chunks.push(`## ${stageTitle}`)
        if (typeof stage?.content_markdown === 'string') {
          chunks.push(stage.content_markdown)
        } else if (typeof stage?.content_html === 'string') {
          chunks.push(stripHtmlTags(stage.content_html))
        }
        if (stage?.checkpoint?.question) {
          chunks.push(`> Checkpoint: ${String(stage.checkpoint.question)}`)
        }
      })
    }

    if (Array.isArray(parsed.io_examples) && parsed.io_examples.length > 0) {
      chunks.push('## Input / Output Examples')
      parsed.io_examples.forEach((example: any, index: number) => {
        chunks.push(`### Example ${index + 1}`)
        chunks.push(`- Input: \`${String(example?.input ?? '')}\``)
        chunks.push(`- Output: \`${String(example?.output ?? '')}\``)
      })
    }

    if (Array.isArray(parsed.hints) && parsed.hints.length > 0) {
      chunks.push('## Hints')
      parsed.hints.forEach((hint: any) => chunks.push(`- ${String(hint)}`))
    }

    if (typeof parsed.completion_summary === 'string') {
      chunks.push('## Summary')
      chunks.push(parsed.completion_summary)
    }

    const output = chunks.join('\n\n').trim()
    return output || unescaped
  } catch {
    return unescaped
  }
}

function splitMarkdownIntoSections(markdown: string): MarkdownSection[] {
  const source = (markdown || '').replace(/\r\n/g, '\n').trim()
  if (!source) {
    return [{ title: 'Overview', body: 'Lesson content is coming soon.' }]
  }

  const lines = source.split('\n')
  const sections: MarkdownSection[] = []
  let currentTitle = 'Overview'
  let currentLines: string[] = []
  let inCodeFence = false

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inCodeFence = !inCodeFence
      currentLines.push(line)
      continue
    }

    if (!inCodeFence && /^##\s+/.test(line)) {
      if (currentLines.join('\n').trim()) {
        sections.push({ title: currentTitle, body: currentLines.join('\n').trim() })
      }
      currentTitle = line.replace(/^##\s+/, '').trim()
      currentLines = []
      continue
    }
    currentLines.push(line)
  }

  if (currentLines.join('\n').trim()) {
    sections.push({ title: currentTitle, body: currentLines.join('\n').trim() })
  }

  return sections.length > 0 ? sections : [{ title: 'Overview', body: source }]
}

function inferMonacoLanguage(source: string): MonacoLanguage {
  const normalized = source.toLowerCase()
  if (/(^|\s)(function|const|let|=>|console\.log)/.test(normalized)) return 'javascript'
  if (/(^|\s)(interface|type|enum|implements|readonly)/.test(normalized)) return 'typescript'
  if (/(^|\s)(public class|system\.out\.println)/.test(normalized)) return 'java'
  if (/(^|\s)(#include|std::|cout\s*<<)/.test(normalized)) return 'cpp'
  if (/(^|\s)(def |import |print\(|elif |except )/.test(normalized)) return 'python'
  return 'python'
}

function runStaticChecks(code: string, language: MonacoLanguage): StaticIssue[] {
  const issues: StaticIssue[] = []

  const stack: string[] = []
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
  for (const char of code) {
    if (char === '(' || char === '[' || char === '{') stack.push(char)
    if (char === ')' || char === ']' || char === '}') {
      const expected = pairs[char]
      const found = stack.pop()
      if (found !== expected) {
        issues.push({ severity: 'error', message: 'Mismatched brackets detected.' })
        break
      }
    }
  }
  if (stack.length > 0) {
    issues.push({ severity: 'error', message: 'A bracket appears to be left open.' })
  }

  if (language === 'python') {
    const controlFlowRegex = /^\s*(if |elif |else|for |while |def |class |try|except |with )/
    const lines = code.split('\n')
    for (let idx = 0; idx < lines.length; idx += 1) {
      const line = lines[idx]
      if (controlFlowRegex.test(line) && !line.trim().endsWith(':')) {
        issues.push({ severity: 'warning', message: `Line ${idx + 1} looks like Python control flow but is missing a trailing colon.` })
        break
      }
    }
  }

  if ((language === 'javascript' || language === 'typescript') && /console\.log\(.+\n/.test(code) && !/;\s*$/m.test(code)) {
    issues.push({ severity: 'warning', message: 'JavaScript/TypeScript line may be missing a semicolon.' })
  }

  return issues
}

export const dynamic = 'force-dynamic'

export default function LessonViewer() {
  const params = useParams()
  const lessonId = params?.id as string
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [currentCheckpoint, setCurrentCheckpoint] = useState<Checkpoint | null>(null)
  const [code, setCode] = useState('')
  const [editorLanguage, setEditorLanguage] = useState<MonacoLanguage>('python')
  const [courseLanguage, setCourseLanguage] = useState<string>('python')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<{ passed: boolean; score: number; results: Array<{ passed: boolean }> } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const router = useRouter()

  useEffect(() => {
    void loadLessonData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  const normalizedLessonContent = useMemo(() => normalizeLessonMarkdown(lesson?.content_body || ''), [lesson?.content_body])
  const sections = useMemo(() => splitMarkdownIntoSections(normalizedLessonContent), [normalizedLessonContent])

  const staticIssues = useMemo(() => runStaticChecks(code, editorLanguage), [code, editorLanguage])

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

      setUser({ id: authUser.id })

      const { data: lessonData, error: lessonError } = await supabase.from('lessons').select('*').eq('id', lessonId).single()
      if (lessonError) throw lessonError
      setLesson(lessonData)

      const { data: unitData } = await supabase.from('units').select('course_id').eq('id', lessonData.unit_id).single()
      if (unitData?.course_id) {
        setCourseId(unitData.course_id)
        const { data: courseData } = await supabase.from('courses').select('language').eq('id', unitData.course_id).single()
        if (courseData?.language) {
          setCourseLanguage(String(courseData.language))
          setEditorLanguage(inferMonacoLanguage(String(courseData.language)))
        }
      }

      const { data: checkpointsData, error: checkpointsError } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_index', { ascending: true })

      if (checkpointsError) throw checkpointsError
      const list = (checkpointsData || []) as Checkpoint[]
      setCheckpoints(list)

      if (list.length > 0) {
        const first = list[0]
        setCurrentCheckpoint(first)
        const starter = first.starter_code || ''
        setCode(starter)
        setEditorLanguage(inferMonacoLanguage(`${starter}\n${courseLanguage}`))
      }
    } catch (err: unknown) {
      console.error('[v0] Error loading lesson:', err)
    } finally {
      setLoading(false)
    }
  }

  const onEditorMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance
  }

  async function handleRunTests() {
    if (!currentCheckpoint) return

    setSubmitting(true)
    setTestResults(null)

    try {
      const response = await fetch('/api/judge/checkpoint', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          checkpointId: currentCheckpoint.id,
          code,
          starterCode: currentCheckpoint.starter_code,
          language: editorLanguage,
        }),
      })

      const judged = await response.json()
      if (!response.ok) {
        throw new Error(String(judged?.error || 'Failed to run tests'))
      }

      const allPassed = Boolean(judged.passed)
      const score = Number(judged.score || 0)
      const results = Array.isArray(judged.results) ? judged.results : []

      setTestResults({ passed: allPassed, score, results })

      const supabase = createClient()
      await supabase.from('checkpoint_submissions').insert({
        checkpoint_id: currentCheckpoint.id,
        student_id: user?.id,
        code,
        is_correct: allPassed,
        score,
        test_results: results,
      })

      if (allPassed && lesson && user?.id) {
        await supabase.from('student_lesson_progress').upsert({
          lesson_id: lesson.id,
          student_id: user.id,
          status: 'in_progress',
          last_accessed: new Date().toISOString(),
          score,
        })
      }
    } catch (err: unknown) {
      console.error('[v0] Error running tests:', err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCompleteLesson() {
    if (!lesson || !user?.id) return

    const supabase = createClient()
    try {
      await supabase.from('student_lesson_progress').upsert({
        lesson_id: lesson.id,
        student_id: user.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
      })

      if (courseId) {
        router.push(`/courses/${courseId}`)
        return
      }

      router.push('/student/dashboard')
    } catch (err: unknown) {
      console.error('[v0] Error completing lesson:', err)
    }
  }

  async function handleFormatCode() {
    const action = editorRef.current?.getAction('editor.action.formatDocument')
    if (action) {
      await action.run()
    }
  }

  function switchCheckpoint(checkpoint: Checkpoint) {
    setCurrentCheckpoint(checkpoint)
    setCode(checkpoint.starter_code || '')
    setEditorLanguage(inferMonacoLanguage(`${checkpoint.starter_code || ''}\n${courseLanguage}`))
    setTestResults(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-300">Loading lesson...</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-300">Lesson not found</p>
      </div>
    )
  }

  const activeSection = sections[Math.min(activeSectionIndex, Math.max(0, sections.length - 1))]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={courseId ? `/courses/${courseId}` : '/student/dashboard'}>
              <Button variant="ghost" size="sm" className="gap-2 text-slate-300 hover:bg-slate-800 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-white lg:text-xl">{lesson.title}</h1>
              <p className="truncate text-sm text-slate-400">{lesson.description}</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <Badge className="border-slate-700 bg-slate-900 text-slate-200">Markdown Lesson</Badge>
            <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-200">Monaco Editor</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-4 lg:px-6 lg:py-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <section className="xl:col-span-5">
            <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-4 py-3">
                <p className="text-sm font-medium text-slate-200">Lesson Content</p>
                <p className="text-xs text-slate-400">Structured markdown with section navigation</p>
              </div>

              <div className="border-b border-slate-800 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Four Method Workflow</p>
                <div className="grid grid-cols-1 gap-2">
                  {LEARNING_METHODS.map((method) => (
                    <div key={method.title} className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2">
                      <p className="text-xs font-semibold text-cyan-200">{method.title}</p>
                      <p className="text-xs text-slate-300">{method.prompt}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-b border-slate-800 p-2">
                <div className="flex gap-2 overflow-x-auto">
                  {sections.map((section, index) => (
                    <button
                      key={`${section.title}-${index}`}
                      type="button"
                      onClick={() => setActiveSectionIndex(index)}
                      className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        index === activeSectionIndex
                          ? 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {index + 1}. {section.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-y-auto px-5 py-5">
                <h2 className="mb-4 text-2xl font-semibold text-white">{activeSection.title}</h2>
                <div className="space-y-3 text-slate-200 [&_a]:text-cyan-300 [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-400/60 [&_blockquote]:bg-cyan-500/10 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_code]:rounded [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mt-5 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-7 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-slate-700 [&_pre]:bg-slate-950 [&_pre]:p-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-700 [&_td]:p-2 [&_th]:border [&_th]:border-slate-700 [&_th]:bg-slate-800 [&_th]:p-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {activeSection.body}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </section>

          <section className="xl:col-span-7">
            <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-4 py-3">
                <p className="text-sm font-medium text-slate-200">Assignment + Coding Workspace</p>
                <p className="text-xs text-slate-400">Focused center workspace for instructions, coding, and validation</p>
              </div>

              <div className="border-b border-slate-800 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {checkpoints.length === 0 && (
                    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-200">No assignment checkpoints in this lesson yet</Badge>
                  )}
                  {checkpoints.map((checkpoint, index) => (
                    <button
                      key={checkpoint.id}
                      type="button"
                      onClick={() => switchCheckpoint(checkpoint)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        currentCheckpoint?.id === checkpoint.id
                          ? 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {index + 1}. {checkpoint.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {currentCheckpoint ? (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                          <FileCode2 className="h-5 w-5 text-cyan-300" />
                          {currentCheckpoint.title}
                        </h3>
                        <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-200">{currentCheckpoint.points || 0} pts</Badge>
                      </div>
                      <div className="space-y-3 text-sm text-slate-200 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-6 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-slate-700 [&_pre]:bg-slate-900 [&_pre]:p-3 [&_strong]:text-white">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                          {currentCheckpoint.problem_description || 'No assignment instructions provided.'}
                        </ReactMarkdown>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Code2 className="h-5 w-5 text-cyan-300" />
                          <h4 className="text-base font-semibold text-white">Code Editor</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <label htmlFor="editor-language" className="text-xs text-slate-400">
                            Language
                          </label>
                          <select
                            id="editor-language"
                            value={editorLanguage}
                            onChange={(event) => setEditorLanguage(event.target.value as MonacoLanguage)}
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                          >
                            {LANGUAGE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                            onClick={() => setCode(currentCheckpoint.starter_code || '')}
                          >
                            Reset
                          </Button>
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
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-lg border border-slate-700">
                        <MonacoEditor
                          height="420px"
                          language={editorLanguage}
                          value={code}
                          onMount={onEditorMount}
                          onChange={(value) => setCode(value ?? '')}
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: 'on',
                            roundedSelection: false,
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 2,
                            wordWrap: 'on',
                            formatOnPaste: true,
                            formatOnType: true,
                          }}
                        />
                      </div>

                      {staticIssues.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {staticIssues.map((issue, index) => (
                            <div
                              key={`${issue.message}-${index}`}
                              className={`rounded-md border px-3 py-2 text-xs ${
                                issue.severity === 'error'
                                  ? 'border-red-500/30 bg-red-500/10 text-red-200'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                              }`}
                            >
                              {issue.message}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <Button
                          onClick={() => void handleRunTests()}
                          disabled={submitting}
                          className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                        >
                          <PlayCircle className="mr-2 h-4 w-4" />
                          {submitting ? 'Running Tests...' : 'Run Tests'}
                        </Button>
                        {testResults?.passed && (
                          <Button onClick={() => void handleCompleteLesson()} className="bg-emerald-500 text-white hover:bg-emerald-400">
                            <Trophy className="mr-2 h-4 w-4" />
                            Complete Lesson
                          </Button>
                        )}
                      </div>
                    </div>

                    {testResults && (
                      <div
                        className={`rounded-xl border p-4 ${
                          testResults.passed
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : 'border-orange-500/40 bg-orange-500/10'
                        }`}
                      >
                        <h4 className="mb-2 flex items-center gap-2 text-base font-semibold text-white">
                          {testResults.passed ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-emerald-300" />
                              All tests passed
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-5 w-5 text-orange-300" />
                              Some tests failed
                            </>
                          )}
                        </h4>
                        <p className="mb-3 text-sm text-slate-200">Score: {testResults.score.toFixed(0)}%</p>
                        <div className="space-y-2">
                          {testResults.results.map((result, idx) => (
                            <div
                              key={`result-${idx}`}
                              className={`rounded-md border px-3 py-2 text-sm ${
                                result.passed
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                                  : 'border-red-500/30 bg-red-500/10 text-red-200'
                              }`}
                            >
                              Test {idx + 1}: {result.passed ? 'Passed' : 'Failed'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-6 text-sm text-slate-300">
                    This lesson does not have coding checkpoints yet. Add one in content management to enable the coding workspace.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
