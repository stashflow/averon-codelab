'use client'

import nextDynamic from 'next/dynamic'
import type { OnMount } from '@monaco-editor/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  CheckCircle,
  PlayCircle,
  Trophy,
  AlertCircle,
  Code2,
  Braces,
  FileCode2,
  BookOpen,
  Circle,
  Search,
} from 'lucide-react'
import { withCsrfHeaders } from '@/lib/security/csrf-client'
import type { editor } from 'monaco-editor'

const MonacoEditor = nextDynamic(() => import('@monaco-editor/react'), { ssr: false })

type MonacoLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'cpp' | 'c' | 'json'

type Checkpoint = {
  id: string
  title: string
  problem_description: string
  starter_code: string
  points: number
  order_index: number
}

type Lesson = {
  id: string
  title: string
  description: string
  content_body: string
  lesson_number: number | null
  order_index: number | null
  unit_id: string
}

type SidebarLesson = {
  id: string
  title: string
  lesson_number: number | null
  order_index: number | null
}

type SidebarUnit = {
  id: string
  title: string
  unit_number: number | null
  order_index: number | null
  lessons: SidebarLesson[]
}

type MarkdownSection = {
  title: string
  body: string
}

type StaticIssue = {
  severity: 'warning' | 'error'
  message: string
}

type LearningMethodKey = 'spaced_repetition' | 'active_recall' | 'interleaving' | 'deliberate_practice'

const LANGUAGE_OPTIONS: Array<{ value: MonacoLanguage; label: string }> = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'json', label: 'JSON' },
]

const LANGUAGE_BADGE_SRC: Record<MonacoLanguage, string> = {
  python: '/languages/python.svg',
  javascript: '/languages/javascript.svg',
  typescript: '/languages/typescript.svg',
  java: '/languages/java.svg',
  cpp: '/languages/cpp.svg',
  c: '/languages/c.svg',
  json: '/languages/json.svg',
}

const LEARNING_METHODS = [
  {
    key: 'spaced_repetition' as LearningMethodKey,
    title: 'Spaced Repetition',
    focusLabel: 'Recall prior concept',
    prompt: 'Restate one concept from the previous lesson before writing code.',
  },
  {
    key: 'active_recall' as LearningMethodKey,
    title: 'Active Recall',
    focusLabel: 'Predict before run',
    prompt: 'Predict output for one test case before running the checker.',
  },
  {
    key: 'interleaving' as LearningMethodKey,
    title: 'Interleaving',
    focusLabel: 'Connect across units',
    prompt: 'Connect this task to a concept from a different unit.',
  },
  {
    key: 'deliberate_practice' as LearningMethodKey,
    title: 'Deliberate Practice',
    focusLabel: 'Revise with intent',
    prompt: 'Revise one part of your solution after feedback to improve clarity.',
  },
]

function getLanguageLabel(language: MonacoLanguage): string {
  return LANGUAGE_OPTIONS.find((option) => option.value === language)?.label || language
}

function languageExtension(language: MonacoLanguage): string {
  if (language === 'python') return 'py'
  if (language === 'javascript') return 'js'
  if (language === 'typescript') return 'ts'
  if (language === 'java') return 'java'
  if (language === 'cpp') return 'cpp'
  if (language === 'c') return 'c'
  return 'json'
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

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

function normalizeLessonMarkdown(raw: string): string {
  let source = (raw || '').trim()
  if (!source) return ''

  source = source.includes('\\n') ? source.replace(/\\n/g, '\n') : source

  if (source.startsWith('"') && source.endsWith('"')) {
    try {
      const parsedString = JSON.parse(source)
      if (typeof parsedString === 'string') {
        source = parsedString
      }
    } catch {
      // Keep raw source if parse fails.
    }
  }

  if (!source.startsWith('{') && !source.startsWith('[')) {
    if (/<[a-z][\s\S]*>/i.test(source) && !source.includes('#')) {
      return repairInlineMarkdown(stripHtmlTags(source))
    }
    return repairInlineMarkdown(source)
  }

  try {
    const parsed = JSON.parse(source) as any
    if (typeof parsed === 'string') return repairInlineMarkdown(parsed)

    if (Array.isArray(parsed)) {
      const chunks = parsed
        .map((item, index) => {
          if (typeof item === 'string') return item
          if (!item || typeof item !== 'object') return ''
          const title = String(item.title || item.name || `Section ${index + 1}`)
          const body = String(item.body || item.content_markdown || item.content || '')
          return `## ${title}\n\n${body}`
        })
        .filter(Boolean)
      return repairInlineMarkdown(chunks.join('\n\n').trim() || source)
    }

    if (!parsed || typeof parsed !== 'object') return repairInlineMarkdown(source)

    if (typeof parsed.markdown === 'string') return repairInlineMarkdown(parsed.markdown)
    if (typeof parsed.content_markdown === 'string') return repairInlineMarkdown(parsed.content_markdown)
    if (typeof parsed.content_body === 'string') return repairInlineMarkdown(parsed.content_body)
    if (typeof parsed.body === 'string') return repairInlineMarkdown(parsed.body)

    const chunks: string[] = []

    if (typeof parsed.challenge_title === 'string') {
      chunks.push(`# ${parsed.challenge_title}`)
    } else if (typeof parsed.title === 'string') {
      chunks.push(`# ${parsed.title}`)
    }

    if (typeof parsed.description === 'string') {
      chunks.push(parsed.description)
    }

    const sectionGroups = [parsed.stages, parsed.sections, parsed.pages, parsed.notes_pages]
    for (const group of sectionGroups) {
      if (!Array.isArray(group)) continue
      group.forEach((section: any, index: number) => {
        const sectionTitle = String(section?.title || section?.name || `Section ${index + 1}`)
        chunks.push(`## ${sectionTitle}`)
        if (typeof section?.content_markdown === 'string') chunks.push(section.content_markdown)
        else if (typeof section?.content === 'string') chunks.push(section.content)
        else if (typeof section?.content_html === 'string') chunks.push(stripHtmlTags(section.content_html))

        if (Array.isArray(section?.questions) && section.questions.length > 0) {
          chunks.push('### Questions')
          section.questions.forEach((question: unknown) => chunks.push(`- Q: ${String(question)}`))
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
      parsed.hints.forEach((hint: unknown) => chunks.push(`- ${String(hint)}`))
    }

    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      chunks.push('## Quick Questions')
      parsed.questions.forEach((question: unknown) => chunks.push(`- Q: ${String(question)}`))
    }

    if (typeof parsed.completion_summary === 'string') {
      chunks.push('## Summary')
      chunks.push(parsed.completion_summary)
    }

    const output = chunks.join('\n\n').trim()
    return repairInlineMarkdown(output || source)
  } catch {
    return repairInlineMarkdown(source)
  }
}

function buildFallbackLessonMarkdown(title: string, description: string): string {
  return `# ${title}\n\n## Notes Page 1: Core Idea\n${description || 'This lesson is being updated. Use this page to summarize the core concept in your own words.'}\n\n## Notes Page 2: Guided Steps\n1. Read the lesson goal and restate it in one sentence.\n2. Predict what the sample code should do.\n3. Implement the checkpoint task and test iteratively.\n\n## Quick Questions\n- Q: What input does the function require?\n- Q: What output format must your code return?\n- Q: Which edge case could break your first draft?\n\n## Four-Method Learning Loop\n- **Spaced Repetition:** connect this lesson to one prior concept.\n- **Active Recall:** predict one test result before running tests.\n- **Interleaving:** compare this lesson to another unit concept.\n- **Deliberate Practice:** improve readability after tests pass.`
}

function ensureFourMethodBlock(markdown: string): string {
  if (/Four-Method Learning Loop/i.test(markdown)) return markdown
  return `${markdown.trim()}\n\n## Four-Method Learning Loop\n- **Spaced Repetition:** restate one prior concept this lesson depends on.\n- **Active Recall:** predict output before running any code.\n- **Interleaving:** relate this task to a previous unit and explain the connection.\n- **Deliberate Practice:** revise after feedback and improve one measurable quality metric.`
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

function extractQuestions(markdownSectionBody: string): string[] {
  const lines = markdownSectionBody.split('\n')
  const questions: string[] = []
  let inCodeFence = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (/^```/.test(line)) {
      inCodeFence = !inCodeFence
      continue
    }
    if (inCodeFence || !line) continue

    const markerMatch = line.match(/^[-*]\s*(?:Q:|\*\*Q:\*\*)\s*(.+)$/i)
    if (markerMatch?.[1]) {
      questions.push(markerMatch[1].trim())
      continue
    }

    if (!line.startsWith('#') && line.endsWith('?') && line.length > 8) {
      questions.push(line.replace(/^[-*]\s*/, '').trim())
    }
  }

  return Array.from(new Set(questions)).slice(0, 6)
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

function normalizeMethodName(input: string): LearningMethodKey | null {
  const value = input.toLowerCase()
  if (value.includes('spaced')) return 'spaced_repetition'
  if (value.includes('active')) return 'active_recall'
  if (value.includes('interleav')) return 'interleaving'
  if (value.includes('deliberate')) return 'deliberate_practice'
  return null
}

function detectPrimaryMethod(markdown: string): LearningMethodKey {
  const lines = markdown.split('\n')
  for (const rawLine of lines) {
    const line = rawLine.trim()
    const match = line.match(/primary method:\s*(.+)$/i)
    if (!match?.[1]) continue
    const normalized = normalizeMethodName(match[1])
    if (normalized) return normalized
  }
  return 'active_recall'
}

export const dynamic = 'force-dynamic'

export default function LessonViewer() {
  const params = useParams()
  const lessonId = params?.id as string

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [courseTitle, setCourseTitle] = useState('Course')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseUnits, setCourseUnits] = useState<SidebarUnit[]>([])
  const [lessonSearch, setLessonSearch] = useState('')
  const [progressByLessonId, setProgressByLessonId] = useState<Map<string, string>>(new Map())

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [currentCheckpoint, setCurrentCheckpoint] = useState<Checkpoint | null>(null)

  const [code, setCode] = useState('')
  const [editorLanguage, setEditorLanguage] = useState<MonacoLanguage>('python')
  const [courseLanguage, setCourseLanguage] = useState<string>('python')
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })

  const [testResults, setTestResults] = useState<{ passed: boolean; score: number; results: Array<{ passed: boolean }> } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const [questionResponses, setQuestionResponses] = useState<Record<string, string>>({})
  const [methodChecksBySection, setMethodChecksBySection] = useState<Record<string, Record<LearningMethodKey, boolean>>>({})

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const router = useRouter()

  useEffect(() => {
    void loadLessonData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  const markdownSource = useMemo(() => {
    const normalized = normalizeLessonMarkdown(lesson?.content_body || '')
    const fallback = buildFallbackLessonMarkdown(lesson?.title || 'Lesson', lesson?.description || '')
    return ensureFourMethodBlock(normalized || fallback)
  }, [lesson?.content_body, lesson?.description, lesson?.title])

  const sections = useMemo(() => splitMarkdownIntoSections(markdownSource), [markdownSource])
  const activeSection = sections[Math.min(activeSectionIndex, Math.max(0, sections.length - 1))]
  const sectionQuestions = useMemo(() => extractQuestions(activeSection?.body || ''), [activeSection])
  const checkpointMarkdown = useMemo(
    () => normalizeLessonMarkdown(currentCheckpoint?.problem_description || ''),
    [currentCheckpoint?.problem_description],
  )
  const primaryMethod = useMemo(() => detectPrimaryMethod(markdownSource), [markdownSource])
  const methodStorageKey = useMemo(() => `acl:lesson-methods:${lessonId}`, [lessonId])
  const methodChecks = useMemo(() => {
    const raw = methodChecksBySection[String(activeSectionIndex)]
    return {
      spaced_repetition: raw?.spaced_repetition || false,
      active_recall: raw?.active_recall || false,
      interleaving: raw?.interleaving || false,
      deliberate_practice: raw?.deliberate_practice || false,
    }
  }, [activeSectionIndex, methodChecksBySection])
  const completedMethodCount = useMemo(
    () => Object.values(methodChecks).filter(Boolean).length,
    [methodChecks],
  )
  const primaryMethodMeta = useMemo(
    () => LEARNING_METHODS.find((method) => method.key === primaryMethod) || LEARNING_METHODS[0],
    [primaryMethod],
  )

  const filteredUnits = useMemo(() => {
    const query = lessonSearch.trim().toLowerCase()
    if (!query) return courseUnits

    return courseUnits
      .map((unit) => {
        const unitMatches = unit.title.toLowerCase().includes(query)
        const lessons = unit.lessons.filter((entry) => entry.title.toLowerCase().includes(query) || unitMatches)
        return { ...unit, lessons }
      })
      .filter((unit) => unit.lessons.length > 0 || unit.title.toLowerCase().includes(query))
  }, [courseUnits, lessonSearch])

  const staticIssues = useMemo(() => runStaticChecks(code, editorLanguage), [code, editorLanguage])

  useEffect(() => {
    if (!methodStorageKey) return
    try {
      const raw = localStorage.getItem(methodStorageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, Record<LearningMethodKey, boolean>>
      if (parsed && typeof parsed === 'object') setMethodChecksBySection(parsed)
    } catch {
      // Ignore malformed local method state.
    }
  }, [methodStorageKey])

  useEffect(() => {
    if (!methodStorageKey) return
    localStorage.setItem(methodStorageKey, JSON.stringify(methodChecksBySection))
  }, [methodChecksBySection, methodStorageKey])

  async function loadLessonData() {
    const supabase = createClient()
    let resolvedCourseLanguage = 'python'

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

      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('id, title, description, content_body, unit_id, lesson_number, order_index')
        .eq('id', lessonId)
        .single()
      if (lessonError || !lessonData) throw lessonError
      setLesson(lessonData as Lesson)

      const { data: unitData } = await supabase.from('units').select('id, course_id').eq('id', lessonData.unit_id).single()
      const resolvedCourseId = unitData?.course_id || null
      if (resolvedCourseId) {
        setCourseId(resolvedCourseId)

        const [{ data: courseData }, { data: unitsData }, { data: progressRows }] = await Promise.all([
          supabase.from('courses').select('name, language').eq('id', resolvedCourseId).single(),
          supabase
            .from('units')
            .select('id, title, unit_number, order_index, lessons(id, title, lesson_number, order_index)')
            .eq('course_id', resolvedCourseId)
            .order('order_index', { ascending: true }),
          supabase.from('student_lesson_progress').select('lesson_id, status').eq('student_id', authUser.id),
        ])

        if (courseData?.name) setCourseTitle(String(courseData.name))

        const languageHint = String(courseData?.language || 'python')
        resolvedCourseLanguage = languageHint
        setCourseLanguage(languageHint)

        const normalizedUnits = ((unitsData || []) as SidebarUnit[])
          .map((unit) => ({
            ...unit,
            lessons: (unit.lessons || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
          }))
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

        setCourseUnits(normalizedUnits)

        const progressMap = new Map<string, string>()
        ;(progressRows || []).forEach((row: any) => {
          progressMap.set(String(row.lesson_id), String(row.status || 'not_started'))
        })
        setProgressByLessonId(progressMap)

        setEditorLanguage(inferMonacoLanguage(languageHint))
      }

      const { data: checkpointsData, error: checkpointsError } = await supabase
        .from('checkpoints')
        .select('id, title, problem_description, starter_code, points, order_index')
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
        setEditorLanguage(inferMonacoLanguage(`${starter}\n${resolvedCourseLanguage}`))
      } else {
        setCurrentCheckpoint(null)
        setCode('')
      }

      setActiveSectionIndex(0)
    } catch (err: unknown) {
      console.error('[v0] Error loading lesson:', err)
    } finally {
      setLoading(false)
    }
  }

  const onEditorMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance
    const position = editorInstance.getPosition()
    if (position) {
      setCursorPosition({ line: position.lineNumber, column: position.column })
    }

    editorInstance.onDidChangeCursorPosition((event) => {
      setCursorPosition({ line: event.position.lineNumber, column: event.position.column })
    })
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

      setProgressByLessonId((previous) => {
        const next = new Map(previous)
        next.set(lesson.id, 'completed')
        return next
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

  function getLessonStatus(lessonEntryId: string): 'completed' | 'in_progress' | 'not_started' {
    const status = progressByLessonId.get(lessonEntryId)
    if (status === 'completed') return 'completed'
    if (status === 'in_progress') return 'in_progress'
    return 'not_started'
  }

  function getQuestionResponseKey(questionIndex: number): string {
    return `${lessonId}:${activeSectionIndex}:${questionIndex}`
  }

  function checkpointFileName(): string {
    if (!currentCheckpoint) return `lesson.${languageExtension(editorLanguage)}`
    const slug = slugify(currentCheckpoint.title || 'checkpoint') || 'checkpoint'
    return `${slug}.${languageExtension(editorLanguage)}`
  }

  function toggleMethodCheck(method: LearningMethodKey) {
    setMethodChecksBySection((prev) => {
      const sectionKey = String(activeSectionIndex)
      const current = prev[sectionKey] || {
        spaced_repetition: false,
        active_recall: false,
        interleaving: false,
        deliberate_practice: false,
      }
      return {
        ...prev,
        [sectionKey]: {
          ...current,
          [method]: !current[method],
        },
      }
    })
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={courseId ? `/courses/${courseId}` : '/student/dashboard'}>
              <Button variant="ghost" size="sm" className="gap-2 text-slate-300 hover:bg-slate-800 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-white lg:text-xl">{lesson.title}</h1>
              <p className="truncate text-sm text-slate-400">{courseTitle}</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <Badge className="border-slate-700 bg-slate-900 text-slate-200">Markdown Notes + Questions</Badge>
            <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-200">IDE Workspace</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1800px] px-4 py-4 lg:px-6 lg:py-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <aside className="xl:col-span-3">
            <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-4 py-3">
                <p className="text-sm font-medium text-slate-200">Lesson Sidebar</p>
                <p className="text-xs text-slate-400">Search and open any lesson in this course</p>
              </div>

              <div className="border-b border-slate-800 p-3">
                <label htmlFor="lesson-search" className="sr-only">Search lessons</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    id="lesson-search"
                    value={lessonSearch}
                    onChange={(event) => setLessonSearch(event.target.value)}
                    placeholder="Search lesson or unit"
                    className="w-full rounded-md border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="overflow-y-auto p-3">
                <div className="space-y-4">
                  {filteredUnits.map((unit) => (
                    <div key={unit.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-300">
                        Unit {unit.unit_number || unit.order_index || '-'}
                      </p>
                      <p className="mb-3 text-sm font-semibold text-white">{unit.title}</p>

                      <div className="space-y-2">
                        {unit.lessons.map((entry) => {
                          const active = entry.id === lesson.id
                          const status = getLessonStatus(entry.id)
                          return (
                            <Link key={entry.id} href={`/lesson/${entry.id}`}>
                              <div
                                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                                  active
                                    ? 'border border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
                                    : 'border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="truncate">
                                    {entry.lesson_number || entry.order_index || '-'} . {entry.title}
                                  </p>
                                </div>
                                <div className="ml-3 shrink-0">
                                  {status === 'completed' ? (
                                    <CheckCircle className="h-4 w-4 text-emerald-300" />
                                  ) : status === 'in_progress' ? (
                                    <Circle className="h-4 w-4 text-cyan-300" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-slate-600" />
                                  )}
                                </div>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {filteredUnits.length === 0 && (
                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
                      No lessons match your search.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <section className="xl:col-span-4">
            <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-4 py-3">
                <p className="text-sm font-medium text-slate-200">Lesson Notes</p>
                <p className="text-xs text-slate-400">Markdown notes pages and guided questions</p>
              </div>

              <div className="border-b border-slate-800 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Four Method Workflow</p>
                  <Badge className="border-slate-700 bg-slate-900 text-slate-200">
                    {completedMethodCount} / 4 complete
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {LEARNING_METHODS.map((method) => (
                    <button
                      key={method.title}
                      type="button"
                      onClick={() => toggleMethodCheck(method.key)}
                      className={`rounded-md border px-3 py-2 text-left transition ${
                        methodChecks[method.key]
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : method.key === primaryMethod
                            ? 'border-cyan-500/40 bg-cyan-500/10'
                            : 'border-slate-700 bg-slate-950/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-cyan-200">{method.title}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                            methodChecks[method.key]
                              ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100'
                              : 'border-slate-600 text-slate-300'
                          }`}
                        >
                          {methodChecks[method.key] ? 'Done' : 'Mark'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{method.prompt}</p>
                    </button>
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
                      Notes {index + 1}: {section.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-white">{activeSection?.title || 'Overview'}</h2>
                  <Badge className="border-slate-700 bg-slate-900 text-slate-200">
                    Page {Math.min(activeSectionIndex + 1, sections.length)} / {sections.length}
                  </Badge>
                </div>

                <div className="space-y-3 text-slate-200 [&_a]:text-cyan-300 [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-400/60 [&_blockquote]:bg-cyan-500/10 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_code]:rounded [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mt-5 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-7 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-slate-700 [&_pre]:bg-slate-950 [&_pre]:p-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-700 [&_td]:p-2 [&_th]:border [&_th]:border-slate-700 [&_th]:bg-slate-800 [&_th]:p-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {activeSection?.body || 'Lesson notes are loading.'}
                  </ReactMarkdown>
                </div>

                <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-cyan-300" />
                    <p className="text-sm font-semibold text-white">Notes Questions</p>
                  </div>

                  {sectionQuestions.length > 0 ? (
                    <div className="space-y-3">
                      {sectionQuestions.map((question, index) => {
                        const key = getQuestionResponseKey(index)
                        return (
                          <div key={`${key}-${question}`} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                            <p className="mb-2 text-sm text-slate-100">Q{index + 1}. {question}</p>
                            <textarea
                              value={questionResponses[key] || ''}
                              onChange={(event) => setQuestionResponses((prev) => ({ ...prev, [key]: event.target.value }))}
                              placeholder="Write your response here..."
                              rows={3}
                              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
                            />
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No explicit questions were found on this notes page yet.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="xl:col-span-5">
            <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-4 py-3">
                <p className="text-sm font-medium text-slate-200">Assignment + Coding Environment</p>
                <p className="text-xs text-slate-400">Production-style editor with tests and completion flow</p>
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
                      <div className="mb-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Method Focus</p>
                        <p className="text-sm text-cyan-100">{primaryMethodMeta.title}: {primaryMethodMeta.prompt}</p>
                      </div>
                      <div className="space-y-3 text-sm text-slate-200 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-6 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-slate-700 [&_pre]:bg-slate-900 [&_pre]:p-3 [&_strong]:text-white">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                          {checkpointMarkdown || 'No assignment instructions provided.'}
                        </ReactMarkdown>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="flex items-center gap-2 text-base font-semibold text-white">
                          <Code2 className="h-5 w-5 text-cyan-300" />
                          Code Editor
                        </h4>
                        <div className="flex items-center gap-2">
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

                      <div className="overflow-hidden rounded-lg border border-slate-700 bg-[#0b1020]">
                        <div className="flex items-center justify-between border-b border-slate-700 bg-[#111a33] px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                            </div>
                            <div className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200">
                              {checkpointFileName()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="overflow-hidden rounded-md border border-slate-700 bg-slate-900">
                              <Image
                                src={LANGUAGE_BADGE_SRC[editorLanguage]}
                                alt={`${getLanguageLabel(editorLanguage)} language`}
                                width={160}
                                height={56}
                                className="h-7 w-auto"
                              />
                            </div>
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
                          </div>
                        </div>

                        <MonacoEditor
                          height="420px"
                          language={editorLanguage}
                          value={code}
                          onMount={onEditorMount}
                          onChange={(value) => setCode(value ?? '')}
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: true },
                            fontSize: 14,
                            lineNumbers: 'on',
                            roundedSelection: false,
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 2,
                            wordWrap: 'on',
                            formatOnPaste: true,
                            formatOnType: true,
                            cursorSmoothCaretAnimation: 'on',
                            smoothScrolling: true,
                            bracketPairColorization: { enabled: true },
                            guides: { bracketPairs: true, indentation: true },
                          }}
                        />

                        <div className="flex items-center justify-between border-t border-slate-700 bg-[#111a33] px-3 py-2 text-xs text-slate-300">
                          <div className="flex items-center gap-4">
                            <span>{getLanguageLabel(editorLanguage)}</span>
                            <span>UTF-8</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span>Ln {cursorPosition.line}</span>
                            <span>Col {cursorPosition.column}</span>
                          </div>
                        </div>
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
