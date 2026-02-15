'use client'

import nextDynamic from 'next/dynamic'
import type { OnMount } from '@monaco-editor/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
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
  PanelLeftClose,
  PanelLeftOpen,
  NotebookText,
  X,
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

type QuickQuizItem = {
  id: string
  question: string
  options: string[]
  correctIndex: number
  rationale: string
}

type PersistedNotionQuestion = {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
  rationale: string
  orderIndex: number
}

type ApcspFrameworkTag = {
  unitLabel: string
  bigIdeas: string[]
  practices: string[]
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

const LANGUAGE_BADGE_SRC: Record<MonacoLanguage, string> = {
  python: '/languages/python.svg',
  javascript: '/languages/javascript.svg',
  typescript: '/languages/typescript.svg',
  java: '/languages/java.svg',
  cpp: '/languages/cpp.svg',
  c: '/languages/c.svg',
  json: '/languages/json.svg',
}

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
      if (typeof parsedString === 'string') source = parsedString
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

    if (typeof parsed.challenge_title === 'string') chunks.push(`# ${parsed.challenge_title}`)
    else if (typeof parsed.title === 'string') chunks.push(`# ${parsed.title}`)

    if (typeof parsed.description === 'string') chunks.push(parsed.description)

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
  return `# ${title}\n\n## Notes Page 1: Core Idea\n${description || 'This lesson is being updated. Use this page to summarize the core concept in your own words.'}\n\n## Notes Page 2: Guided Steps\n1. Read the lesson goal and restate it in one sentence.\n2. Predict what the sample code should do.\n3. Implement the checkpoint task and test iteratively.\n\n## Quick Questions\n- Q: What input does the function require?\n- Q: What output format must your code return?\n- Q: Which edge case could break your first draft?`
}

function splitMarkdownIntoSections(markdown: string): MarkdownSection[] {
  const source = (markdown || '').replace(/\r\n/g, '\n').trim()
  if (!source) return [{ title: 'Overview', body: 'Lesson content is coming soon.' }]

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

  const filtered = sections.filter((section) => !/four-method learning loop/i.test(section.title))
  return filtered.length > 0 ? filtered : [{ title: 'Overview', body: source }]
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

function normalizeLanguageHint(source: string): MonacoLanguage | null {
  const normalized = source.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes('python')) return 'python'
  if (normalized.includes('javascript') || normalized === 'js') return 'javascript'
  if (normalized.includes('typescript') || normalized === 'ts') return 'typescript'
  if (normalized.includes('java')) return 'java'
  if (normalized.includes('c++') || normalized === 'cpp') return 'cpp'
  if (normalized === 'c') return 'c'
  if (normalized.includes('json')) return 'json'
  return null
}

function extractCodeFromMarkdown(source: string, preferred: MonacoLanguage): string | null {
  const input = String(source || '')
  const fencedRegex = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g
  const blocks: Array<{ lang: string; code: string }> = []

  let match: RegExpExecArray | null
  while ((match = fencedRegex.exec(input)) !== null) {
    blocks.push({ lang: String(match[1] || '').toLowerCase(), code: String(match[2] || '').trim() })
  }

  if (blocks.length === 0) return null
  const exact = blocks.find((block) => block.lang.includes(preferred))
  if (exact?.code) return exact.code

  const pythonish = blocks.find((block) => block.lang.includes('python') || block.lang === 'py')
  if (preferred === 'python' && pythonish?.code) return pythonish.code

  return blocks[0]?.code || null
}

function looksLikePython(source: string): boolean {
  const input = String(source || '')
  if (!input.trim()) return false
  return /(def\s+\w+\(|import\s+\w+|from\s+\w+\s+import|print\(|if\s+.+:|for\s+.+:|while\s+.+:|return\s+.+)/.test(input)
}

function defaultStarterForLanguage(language: MonacoLanguage): string {
  if (language === 'python') return 'def solve():\n    # TODO: write your solution\n    return None\n'
  if (language === 'javascript') return 'function solve() {\n  // TODO: write your solution\n  return null;\n}\n'
  if (language === 'typescript') return 'function solve(): unknown {\n  // TODO: write your solution\n  return null;\n}\n'
  if (language === 'java') return 'class Main {\n  static Object solve() {\n    // TODO: write your solution\n    return null;\n  }\n}\n'
  if (language === 'cpp') return '#include <iostream>\n\nint main() {\n  // TODO: write your solution\n  return 0;\n}\n'
  if (language === 'c') return '#include <stdio.h>\n\nint main(void) {\n  // TODO: write your solution\n  return 0;\n}\n'
  return '{}\n'
}

function normalizeStarterCode(rawStarter: string, preferred: MonacoLanguage): string {
  const direct = String(rawStarter || '').trim()
  const extracted = extractCodeFromMarkdown(direct, preferred)
  const candidate = (extracted || direct).trim()

  if (!candidate) return defaultStarterForLanguage(preferred)

  if (preferred === 'python') {
    if (looksLikePython(candidate)) return `${candidate}\n`
    const inferred = inferMonacoLanguage(candidate)
    if (inferred !== 'python') return defaultStarterForLanguage('python')
    return `${candidate}\n`
  }

  return `${candidate}\n`
}

function resolvePreferredLanguage(courseTitle: string, courseLanguageHint: string, starterCode: string): MonacoLanguage {
  const title = courseTitle.toLowerCase()
  if (title.includes('ap computer science principles') || title.includes('ap csp')) return 'python'

  const fromCourse = normalizeLanguageHint(courseLanguageHint)
  if (fromCourse) return fromCourse

  return inferMonacoLanguage(starterCode)
}

function buildPseudocodeGuide(checkpoint: Checkpoint | null): string[] {
  if (!checkpoint) return []
  const title = checkpoint.title.toLowerCase()
  if (title.includes('first function') || title.includes('greet')) {
    return [
      'Define a function with one input name.',
      'Build a greeting string using "Hello, " + name + "!".',
      'Return the greeting string.',
    ]
  }
  if (title.includes('conditional') || title.includes('classify') || title.includes('temp')) {
    return [
      'If temperature is less than 50, return "cold".',
      'Else if temperature is less than 75, return "warm".',
      'Otherwise return "hot".',
    ]
  }
  if (title.includes('normalize') || title.includes('name')) {
    return [
      'Remove leading and trailing spaces from input.',
      'Reduce repeated spaces to single spaces.',
      'Convert each word to title case and return result.',
    ]
  }
  return [
    'Read the required input and output format.',
    'Plan the algorithm in 2-3 clear steps.',
    'Implement the same steps in Python.',
  ]
}

function buildApcspQuiz(lessonTitle: string): QuickQuizItem[] {
  const normalizedTitle = lessonTitle.toLowerCase()
  if (normalizedTitle.includes('course intro') || normalizedTitle.includes('unit intro') || normalizedTitle.includes(' intro')) {
    return [
      {
        id: 'q1',
        question: 'What is pseudocode?',
        options: ['A programming language run by Python', 'A plain-language plan for code steps', 'A database table', 'A grading rubric'],
        correctIndex: 1,
        rationale: 'Pseudocode is a plain-language plan before real syntax.',
      },
      {
        id: 'q2',
        question: 'What does IDE stand for?',
        options: ['Integrated Development Environment', 'Internal Debug Engine', 'Internet Data Exchange', 'Input Design Endpoint'],
        correctIndex: 0,
        rationale: 'IDE means Integrated Development Environment.',
      },
      {
        id: 'q3',
        question: 'Best first move when solving a new coding problem:',
        options: ['Guess random code', 'Write steps first, then code', 'Skip instructions', 'Change function names'],
        correctIndex: 1,
        rationale: 'Writing steps first reduces mistakes and confusion.',
      },
    ]
  }
  if (normalizedTitle.includes('first function') || normalizedTitle.includes('greet')) {
    return [
      {
        id: 'q1',
        question: 'What is the output of a function?',
        options: ['The value it returns', 'Only printed text', 'Its parameter names', 'Its indentation'],
        correctIndex: 0,
        rationale: 'A function output is the returned value.',
      },
      {
        id: 'q2',
        question: 'In Python, which keyword sends a value back from a function?',
        options: ['print', 'yield', 'return', 'input'],
        correctIndex: 2,
        rationale: '`return` sends the function result back.',
      },
      {
        id: 'q3',
        question: 'If name is "Ava", what should greet_student(name) return?',
        options: ['Hello Ava', 'Hello, Ava!', 'Ava Hello', 'name'],
        correctIndex: 1,
        rationale: 'Required format is exactly `Hello, <name>!`.',
      },
    ]
  }

  if (normalizedTitle.includes('conditional') || normalizedTitle.includes('temp')) {
    return [
      {
        id: 'q1',
        question: 'Which branch should execute first in an ordered if-chain?',
        options: ['The broadest condition', 'The most specific early condition', 'Always else', 'Randomly'],
        correctIndex: 1,
        rationale: 'Ordered checks should test specific thresholds first.',
      },
      {
        id: 'q2',
        question: 'If temp is 75 and rules are <50 cold, <75 warm, else hot, output is:',
        options: ['cold', 'warm', 'hot', 'error'],
        correctIndex: 2,
        rationale: '75 is not <75, so it falls to else -> hot.',
      },
      {
        id: 'q3',
        question: 'Why is branch order important?',
        options: [
          'Python requires 3 branches',
          'Earlier true conditions stop later checks',
          'It changes variable names',
          'It only affects style',
        ],
        correctIndex: 1,
        rationale: 'Once a condition matches, subsequent branches are skipped.',
      },
    ]
  }

  return [
    {
      id: 'q1',
      question: 'In AP CSP, constraints are best defined as:',
      options: ['Optional style preferences', 'Limits your solution must satisfy', 'Only grading rules', 'Variables chosen by the compiler'],
      correctIndex: 1,
      rationale: 'Constraints are required limits that solutions must satisfy.',
    },
    {
      id: 'q2',
      question: 'Before implementation, AP CSP recommends you first:',
      options: ['Skip directly to code', 'Write pseudocode and define the algorithm', 'Focus only on UI colors', 'Rename all variables'],
      correctIndex: 1,
      rationale: 'Pseudocode clarifies logic before implementation.',
    },
    {
      id: 'q3',
      question: 'Which AP CSP Big Idea includes creating and refining algorithms?',
      options: ['Big Idea 1: Creative Development', 'Big Idea 2: Data', 'Big Idea 4: Computer Systems and Networks', 'Big Idea 5: Impact of Computing'],
      correctIndex: 0,
      rationale: 'Creative Development includes designing and improving computational solutions.',
    },
  ]
}

function inferApcspFrameworkTag(unitTitle: string, lessonTitle: string): ApcspFrameworkTag {
  const text = `${unitTitle} ${lessonTitle}`.toLowerCase()

  if (text.includes('data')) {
    return {
      unitLabel: 'AP CSP Data and Information',
      bigIdeas: ['Big Idea 2: Data'],
      practices: ['CTP 2: Algorithms and Program Development', 'CTP 4: Code Analysis'],
    }
  }

  if (text.includes('internet') || text.includes('network')) {
    return {
      unitLabel: 'AP CSP Computer Systems and Networks',
      bigIdeas: ['Big Idea 4: Computer Systems and Networks'],
      practices: ['CTP 3: Abstraction in Program Development', 'CTP 6: Responsible Computing'],
    }
  }

  if (text.includes('impact') || text.includes('ethic') || text.includes('society')) {
    return {
      unitLabel: 'AP CSP Impact of Computing',
      bigIdeas: ['Big Idea 5: Impact of Computing'],
      practices: ['CTP 1: Computational Solution Design', 'CTP 6: Responsible Computing'],
    }
  }

  if (text.includes('algorithm') || text.includes('function') || text.includes('condition') || text.includes('code')) {
    return {
      unitLabel: 'AP CSP Creative Development',
      bigIdeas: ['Big Idea 1: Creative Development'],
      practices: ['CTP 1: Computational Solution Design', 'CTP 2: Algorithms and Program Development'],
    }
  }

  return {
    unitLabel: 'AP CSP Core Concepts',
    bigIdeas: ['Big Idea 3: Algorithms and Programming'],
    practices: ['CTP 1: Computational Solution Design', 'CTP 4: Code Analysis'],
  }
}

function apcspFrameworkOverview(): Array<{ label: string; items: string[] }> {
  return [
    {
      label: 'Big Ideas',
      items: [
        '1. Creative Development',
        '2. Data',
        '3. Algorithms and Programming',
        '4. Computer Systems and Networks',
        '5. Impact of Computing',
      ],
    },
    {
      label: 'Computational Thinking Practices',
      items: [
        'CTP 1: Computational Solution Design',
        'CTP 2: Algorithms and Program Development',
        'CTP 3: Abstraction in Program Development',
        'CTP 4: Code Analysis',
        'CTP 5: Computing Innovations',
        'CTP 6: Responsible Computing',
      ],
    },
  ]
}

function formatLearnerName(fullName: string | null): string {
  if (!fullName) return 'there'
  const first = fullName.trim().split(/\s+/)[0]
  return first || 'there'
}

function buildCourseIntroSections(learnerName: string): MarkdownSection[] {
  return [
    {
      title: '1.0 Course Welcome',
      body: `Welcome to AP Computer Science Principles, ${learnerName}.\n\nYou are starting from zero, and that is exactly where this course is designed to begin.\n\n> “Programming isn’t about what you know; it’s about what you can figure out.”\n\nIn this course, we will build confidence first, then skill, then speed.`,
    },
    {
      title: 'How This Course Works',
      body: `You will follow a simple rhythm:\n\n1. Learn the idea in plain language.\n2. Try a short check question.\n3. Write a small piece of code.\n4. Improve it with feedback.\n\nEvery step is short on purpose so it never feels overwhelming.`,
    },
    {
      title: 'First Vocabulary Stop',
      body: `**Word:** Algorithm\n\nAn algorithm is just a step-by-step plan to solve a problem.\n\nExample:\n1. Read a name.\n2. Build a greeting.\n3. Return the greeting.\n\nThat is already an algorithm.`,
    },
  ]
}

function buildUnitIntroSections(unitTitle: string, learnerName: string): MarkdownSection[] {
  return [
    {
      title: `${unitTitle}: Quick Intro`,
      body: `${learnerName}, this unit is about building a strong foundation.\n\nYou do not need to be fast. You need to be clear.\n\nWe will move from plain-language reasoning to pseudocode, then to Python.`,
    },
    {
      title: 'Before You Code',
      body: `Use this checklist:\n\n- Can I explain the goal in one sentence?\n- Can I write the steps in pseudocode?\n- Do I know the exact output format?\n\nIf yes, coding becomes much easier.`,
    },
    {
      title: 'Vocabulary Stop: IDE',
      body: `**Word:** IDE (Integrated Development Environment)\n\nAn IDE is the coding workspace where you write code, run tests, and debug mistakes.\n\nThink of it like a player’s training facility: tools, feedback, and practice in one place.`,
    },
  ]
}

function buildVocabSection(lessonTitle: string): MarkdownSection | null {
  const title = lessonTitle.toLowerCase()
  if (title.includes('problem') || title.includes('constraint')) {
    return {
      title: 'Vocabulary Stop: Constraint',
      body: `A **constraint** is a rule your solution must follow.\n\nExample: “Output must match this exact format.”\n\nNotion: Why does exact formatting matter in programming?`,
    }
  }
  if (title.includes('pseudo')) {
    return {
      title: 'Vocabulary Stop: Pseudocode',
      body: `**Pseudocode** is plain-language logic that looks like code steps.\n\nIt helps you think before syntax.\n\nNotion: Write 3 pseudocode steps for making a sandwich.`,
    }
  }
  if (title.includes('print') || title.includes('output')) {
    return {
      title: 'Vocabulary Stop: Output',
      body: `**Output** is the result your program produces.\n\nIn Python, \`print()\` shows output.\n\nNotion: What is the output of \`print(\"Hi\")\`?`,
    }
  }
  if (title.includes('function')) {
    return {
      title: 'Vocabulary Stop: Function',
      body: `A **function** is a reusable block of code with a name.\n\nYou give it input, and it returns output.\n\nNotion: Why are reusable functions helpful in bigger programs?`,
    }
  }
  return {
    title: 'Vocabulary Stop: IDE',
    body: `An **IDE** is your coding workspace.\n\nIt helps you write, run, and fix code faster.\n\nNotion: What IDE feature helps you catch mistakes quickly?`,
  }
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
  const searchParams = useSearchParams()
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
  const [preferredLanguage, setPreferredLanguage] = useState<MonacoLanguage>('python')
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })

  const [testResults, setTestResults] = useState<{ passed: boolean; score: number; results: Array<{ passed: boolean }> } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [user, setUser] = useState<{ id: string } | null>(null)
  const [learnerName, setLearnerName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const [questionResponses, setQuestionResponses] = useState<Record<string, string>>({})
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [notesOpen, setNotesOpen] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizSaving, setQuizSaving] = useState(false)
  const [persistedNotions, setPersistedNotions] = useState<PersistedNotionQuestion[]>([])
  const [visibleNarrativeSteps, setVisibleNarrativeSteps] = useState<Record<number, boolean>>({})

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const lessonFlowRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    void loadLessonData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  const markdownSource = useMemo(() => {
    const normalized = normalizeLessonMarkdown(lesson?.content_body || '')
    const fallback = buildFallbackLessonMarkdown(lesson?.title || 'Lesson', lesson?.description || '')
    return normalized || fallback
  }, [lesson?.content_body, lesson?.description, lesson?.title])

  const viewMode = searchParams.get('view') || ''
  const viewUnitId = searchParams.get('unit') || ''
  const isCourseIntroMode = viewMode === 'course-intro'
  const isUnitIntroMode = viewMode === 'unit-intro'
  const isIntroMode = isCourseIntroMode || isUnitIntroMode

  const lessonSections = useMemo(() => splitMarkdownIntoSections(markdownSource), [markdownSource])
  const currentUnit = useMemo(() => {
    const currentLessonId = lesson?.id
    if (!currentLessonId) return null
    return courseUnits.find((unit) => unit.lessons.some((entry) => entry.id === currentLessonId)) || null
  }, [courseUnits, lesson?.id])
  const currentUnitTitle = currentUnit?.title || 'Unit'

  const isApcspCourse = useMemo(() => /ap computer science principles|ap csp/i.test(courseTitle), [courseTitle])
  const vocabSection = useMemo(
    () => (isApcspCourse && !isIntroMode ? buildVocabSection(lesson?.title || '') : null),
    [isApcspCourse, isIntroMode, lesson?.title],
  )
  const lessonSectionsWithVocab = useMemo(
    () => (vocabSection ? [...lessonSections, vocabSection] : lessonSections),
    [lessonSections, vocabSection],
  )
  const introUnit = useMemo(() => {
    if (!isUnitIntroMode) return null
    return courseUnits.find((unit) => unit.id === viewUnitId) || currentUnit
  }, [courseUnits, currentUnit, isUnitIntroMode, viewUnitId])
  const introSections = useMemo(() => {
    if (!isApcspCourse || !isIntroMode) return [] as MarkdownSection[]
    const name = formatLearnerName(learnerName)
    if (isCourseIntroMode) return buildCourseIntroSections(name)
    return buildUnitIntroSections(introUnit?.title || currentUnitTitle, name)
  }, [currentUnitTitle, introUnit?.title, isApcspCourse, isCourseIntroMode, isIntroMode, learnerName])
  const sections = useMemo(
    () => (isIntroMode ? introSections : lessonSectionsWithVocab),
    [introSections, isIntroMode, lessonSectionsWithVocab],
  )

  const activeSection = sections[Math.min(activeSectionIndex, Math.max(0, sections.length - 1))]
  const sectionQuestions = useMemo(() => extractQuestions(activeSection?.body || ''), [activeSection])
  const checkpointMarkdown = useMemo(
    () => normalizeLessonMarkdown(currentCheckpoint?.problem_description || ''),
    [currentCheckpoint?.problem_description],
  )
  const pseudocodeGuide = useMemo(() => buildPseudocodeGuide(currentCheckpoint), [currentCheckpoint])
  const fallbackLessonNotions = useMemo(
    () => (isApcspCourse && !isIntroMode ? buildApcspQuiz(lesson?.title || '') : []),
    [isApcspCourse, isIntroMode, lesson?.title],
  )
  const introNotions = useMemo(
    () =>
      isCourseIntroMode
        ? buildApcspQuiz('course intro')
        : isUnitIntroMode
          ? buildApcspQuiz(`${introUnit?.title || currentUnitTitle} intro`)
          : [],
    [currentUnitTitle, introUnit?.title, isCourseIntroMode, isUnitIntroMode],
  )
  const notions = useMemo(() => {
    if (isCourseIntroMode || isUnitIntroMode) return introNotions
    if (persistedNotions.length > 0) {
      return persistedNotions.map((item) => ({
        id: item.id,
        question: item.prompt,
        options: item.options,
        correctIndex: item.correctIndex,
        rationale: item.rationale,
      }))
    }
    return fallbackLessonNotions
  }, [fallbackLessonNotions, introNotions, isCourseIntroMode, isUnitIntroMode, persistedNotions])
  const quizScore = useMemo(() => {
    if (notions.length === 0) return 100
    const answered = notions.filter((item) => Number.isFinite(quizAnswers[item.id]))
    if (answered.length === 0) return 0
    const correct = notions.filter((item) => quizAnswers[item.id] === item.correctIndex).length
    return Math.round((correct / notions.length) * 100)
  }, [notions, quizAnswers])
  const hasMinimumNotesResponse = useMemo(() => {
    const responses = Object.values(questionResponses).map((value) => value.trim()).filter(Boolean)
    if (responses.length === 0) return true
    return responses.some((value) => value.length >= 8)
  }, [questionResponses])
  const learningCheckPassed = useMemo(() => {
    if (!isApcspCourse) return true
    if (!quizSubmitted) return false
    return quizScore >= 80 && hasMinimumNotesResponse
  }, [hasMinimumNotesResponse, isApcspCourse, quizScore, quizSubmitted])

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
  const frameworkTag = useMemo(
    () => (isApcspCourse ? inferApcspFrameworkTag(currentUnitTitle, lesson?.title || '') : null),
    [currentUnitTitle, isApcspCourse, lesson?.title],
  )
  const frameworkOverview = useMemo(() => (isApcspCourse ? apcspFrameworkOverview() : []), [isApcspCourse])
  const hasViewedAllNarrativeSteps = useMemo(() => {
    if (sections.length === 0) return true
    return sections.every((_, index) => visibleNarrativeSteps[index])
  }, [sections, visibleNarrativeSteps])

  const staticIssues = useMemo(() => runStaticChecks(code, editorLanguage), [code, editorLanguage])

  useEffect(() => {
    setVisibleNarrativeSteps({})
  }, [lessonId, sections.length])

  useEffect(() => {
    const root = lessonFlowRef.current
    if (!root) return

    const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-note-step]'))
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleNarrativeSteps((previous) => {
          const next = { ...previous }
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const index = Number((entry.target as HTMLElement).dataset.noteStep || -1)
            if (Number.isFinite(index) && index >= 0) next[index] = true
          }
          return next
        })
      },
      { root, threshold: 0.35 },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [sections])

  async function loadLessonData() {
    const supabase = createClient()
    let resolvedCourseLanguage = 'python'
    let resolvedCourseName = ''

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
      const { data: viewerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', authUser.id)
        .maybeSingle()
      setLearnerName((viewerProfile as { full_name?: string | null } | null)?.full_name || null)

      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('id, title, description, content_body, unit_id, lesson_number, order_index')
        .eq('id', lessonId)
        .single()
      if (lessonError || !lessonData) throw lessonError
      setLesson(lessonData as Lesson)
      setQuizAnswers({})

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
        resolvedCourseName = String(courseData?.name || '')

        const languageHint = String(courseData?.language || 'python')
        resolvedCourseLanguage = languageHint
        setCourseLanguage(languageHint)
        const resolvedPreferred = resolvePreferredLanguage(resolvedCourseName, languageHint, '')
        setPreferredLanguage(resolvedPreferred)

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

        setEditorLanguage(resolvePreferredLanguage(resolvedCourseName, languageHint, ''))
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
        const resolved = resolvePreferredLanguage(resolvedCourseName || courseTitle, resolvedCourseLanguage, first.starter_code || '')
        const starter = normalizeStarterCode(first.starter_code || '', resolved)
        setCode(starter)
        setPreferredLanguage(resolved)
        setEditorLanguage(resolved)
      } else {
        setCurrentCheckpoint(null)
        setCode('')
      }

      const { data: notionData } = await supabase
        .from('notion_questions')
        .select('id, prompt, options, correct_index, rationale, order_index')
        .eq('lesson_id', lessonId)
        .order('order_index', { ascending: true })

      const normalizedNotions = ((notionData || []) as any[]).map((row) => ({
        id: String(row.id),
        prompt: String(row.prompt || ''),
        options: Array.isArray(row.options) ? row.options.map((option: unknown) => String(option || '')) : [],
        correctIndex: Number.isFinite(Number(row.correct_index)) ? Number(row.correct_index) : 0,
        rationale: String(row.rationale || ''),
        orderIndex: Number.isFinite(Number(row.order_index)) ? Number(row.order_index) : 0,
      }))
      setPersistedNotions(normalizedNotions)

      if (normalizedNotions.length > 0) {
        const notionIds = normalizedNotions.map((item) => item.id)
        const { data: priorSubmissions } = await supabase
          .from('notion_submissions')
          .select('question_id, selected_index')
          .eq('student_id', authUser.id)
          .in('question_id', notionIds)

        if (Array.isArray(priorSubmissions) && priorSubmissions.length > 0) {
          const mapped: Record<string, number> = {}
          priorSubmissions.forEach((row: any) => {
            mapped[String(row.question_id)] = Number.isFinite(Number(row.selected_index)) ? Number(row.selected_index) : -1
          })
          setQuizAnswers(mapped)
        }
      }

      setActiveSectionIndex(0)
      setQuizSubmitted(false)
    } catch (err: unknown) {
      console.error('[v0] Error loading lesson:', err)
    } finally {
      setLoading(false)
    }
  }

  const onEditorMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance
    const position = editorInstance.getPosition()
    if (position) setCursorPosition({ line: position.lineNumber, column: position.column })

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
          starterCode: normalizeStarterCode(currentCheckpoint.starter_code || '', editorLanguage),
          language: editorLanguage,
        }),
      })

      const judged = await response.json()
      if (!response.ok) throw new Error(String(judged?.error || 'Failed to run tests'))

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
    if (action) await action.run()
  }

  async function handleSubmitNotions() {
    setQuizSubmitted(true)
    if (!user?.id || !lesson || notions.length === 0) return

    setQuizSaving(true)
    const supabase = createClient()
    try {
      const { data: enrollmentRows } = await supabase
        .from('enrollments')
        .select('classroom_id')
        .eq('student_id', user.id)

      const classroomIds = (enrollmentRows || []).map((row: any) => row.classroom_id).filter(Boolean)
      let resolvedClassroomId: string | null = null
      if (classroomIds.length > 0) {
        const { data: assignedRow } = await supabase
          .from('lesson_assignments')
          .select('classroom_id')
          .eq('lesson_id', lesson.id)
          .in('classroom_id', classroomIds)
          .limit(1)
          .maybeSingle()
        resolvedClassroomId = (assignedRow as any)?.classroom_id || null
      }

      const payload = notions
        .map((item) => {
          const selected = Number.isFinite(quizAnswers[item.id]) ? Number(quizAnswers[item.id]) : -1
          if (selected < 0) return null
          const correct = selected === item.correctIndex
          return {
            question_id: item.id,
            student_id: user.id,
            classroom_id: resolvedClassroomId,
            selected_index: selected,
            is_correct: correct,
            score: correct ? 100 : 0,
            answered_at: new Date().toISOString(),
          }
        })
        .filter(Boolean)

      if (payload.length > 0) {
        await supabase
          .from('notion_submissions')
          .upsert(payload as any[], { onConflict: 'question_id,student_id,classroom_id' })
      }
    } catch (error) {
      console.error('[v0] notion submission save failed', error)
    } finally {
      setQuizSaving(false)
    }
  }

  function switchCheckpoint(checkpoint: Checkpoint) {
    setCurrentCheckpoint(checkpoint)
    const resolved = resolvePreferredLanguage(courseTitle, courseLanguage, checkpoint.starter_code || '')
    setCode(normalizeStarterCode(checkpoint.starter_code || '', resolved))
    setPreferredLanguage(resolved)
    setEditorLanguage(resolved)
    setQuizAnswers({})
    setQuizSubmitted(false)
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

  const firstCourseLessonId =
    courseUnits.flatMap((unit) => unit.lessons)[0]?.id || lesson?.id || ''

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

  const pageTitle = isCourseIntroMode
    ? 'Lesson 1.0: Course Introduction'
    : isUnitIntroMode
      ? `Unit Intro: ${introUnit?.title || currentUnitTitle}`
      : lesson.title

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
              <h1 className="truncate text-lg font-semibold text-white lg:text-xl">{pageTitle}</h1>
              <p className="truncate text-sm text-slate-400">{courseTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              <span className="hidden md:inline">{sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNotesOpen(true)}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <NotebookText className="h-4 w-4" />
              <span className="hidden md:inline">Notes</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1800px] px-4 py-4 lg:px-6 lg:py-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <aside className={sidebarCollapsed ? 'xl:col-span-1' : 'xl:col-span-3'}>
            <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-4 py-3">
                <p className="text-sm font-medium text-slate-200">Lessons</p>
                {!sidebarCollapsed && <p className="text-xs text-slate-400">Search and open any lesson in this course</p>}
              </div>

              {!sidebarCollapsed && (
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
              )}

              <div className="overflow-y-auto p-3">
                <div className="space-y-4">
                  {isApcspCourse && (
                    <Link href={`/lesson/${firstCourseLessonId}?view=course-intro`}>
                      <div
                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                          isCourseIntroMode
                            ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
                            : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {!sidebarCollapsed ? '1.0 Course Intro Notes' : '1.0'}
                      </div>
                    </Link>
                  )}

                  {filteredUnits.map((unit) => (
                    <div key={unit.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                      {!sidebarCollapsed && (
                        <>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-300">
                            Unit {unit.unit_number || unit.order_index || '-'}
                          </p>
                          <p className="mb-3 text-sm font-semibold text-white">{unit.title}</p>
                        </>
                      )}

                      <div className="space-y-2">
                        {isApcspCourse && (
                          <Link href={`/lesson/${unit.lessons[0]?.id || lesson.id}?view=unit-intro&unit=${unit.id}`}>
                            <div
                              className={`rounded-md px-3 py-2 text-sm transition ${
                                isUnitIntroMode && introUnit?.id === unit.id
                                  ? 'border border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
                                  : 'border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
                              }`}
                            >
                              {!sidebarCollapsed ? `Unit ${unit.unit_number || unit.order_index || '-'} Intro` : 'U'}
                            </div>
                          </Link>
                        )}

                        {unit.lessons.map((entry) => {
                          const active = !isIntroMode && entry.id === lesson.id
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
                                {!sidebarCollapsed && (
                                  <div className="min-w-0">
                                    <p className="truncate">{entry.lesson_number || entry.order_index || '-'} . {entry.title}</p>
                                  </div>
                                )}
                                <div className={sidebarCollapsed ? 'mx-auto shrink-0' : 'ml-3 shrink-0'}>
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

          <section className={sidebarCollapsed ? 'xl:col-span-8' : 'xl:col-span-6'}>
            <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-4 py-3">
                <p className="text-sm font-medium text-slate-200">{isIntroMode ? 'Guided Notes' : 'Code Editor'}</p>
                <p className="text-xs text-slate-400">
                  {isIntroMode ? 'Read, reflect, and prepare before coding.' : 'Write and run your solution here'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {isIntroMode ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-cyan-300">
                        {isCourseIntroMode ? 'Lesson 1.0' : 'Unit Introduction'}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-white">
                        {isCourseIntroMode ? 'Start Here: AP CSP Course Intro' : `${introUnit?.title || currentUnitTitle} Intro`}
                      </h3>
                      <p className="mt-2 text-sm text-cyan-50">
                        Read these notes in order, then complete the notions check before moving ahead.
                      </p>
                    </div>

                    <div ref={lessonFlowRef} className="max-h-[62vh] space-y-3 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                      {sections.map((section, index) => (
                        <article
                          key={`intro-step-${section.title}-${index}`}
                          data-note-step={index}
                          className={`rounded-lg border border-slate-700 bg-slate-900/70 p-4 transition-all duration-700 ${
                            visibleNarrativeSteps[index] ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-30'
                          }`}
                        >
                          <p className="text-xs uppercase tracking-wide text-cyan-300">Notes {index + 1}</p>
                          <h4 className="mt-1 text-base font-semibold text-white">{section.title}</h4>
                          <div className="mt-2 text-sm text-slate-200 [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-500/60 [&_blockquote]:bg-cyan-500/10 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_li]:ml-5 [&_li]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-6">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                              {section.body}
                            </ReactMarkdown>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                      <p className="text-sm font-semibold text-indigo-100">Notions</p>
                      <p className="text-xs text-indigo-200 mt-1">Answer each multiple-choice notion and grade your understanding.</p>
                      <div className="mt-3 space-y-3">
                        {notions.map((item, index) => {
                          return (
                            <div key={item.id}>
                              <p className="text-sm text-white">N{index + 1}. {item.question}</p>
                              <div className="mt-2 grid gap-1">
                                {item.options.map((option, optionIndex) => (
                                  <label key={`${item.id}-${optionIndex}`} className="flex items-center gap-2 text-sm text-slate-100">
                                    <input
                                      type="radio"
                                      name={`intro-notion-${item.id}`}
                                      checked={quizAnswers[item.id] === optionIndex}
                                      onChange={() => setQuizAnswers((prev) => ({ ...prev, [item.id]: optionIndex }))}
                                    />
                                    <span>{option}</span>
                                  </label>
                                ))}
                              </div>
                              {quizSubmitted && (
                                <p className={`mt-1 text-xs ${quizAnswers[item.id] === item.correctIndex ? 'text-emerald-300' : 'text-orange-300'}`}>
                                  {quizAnswers[item.id] === item.correctIndex ? 'Correct' : `Review: ${item.rationale}`}
                                </p>
                              )}
                            </div>
                          )
                        })}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-indigo-400/40 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30"
                            onClick={() => void handleSubmitNotions()}
                          >
                            {quizSaving ? 'Saving...' : 'Grade Notions'}
                          </Button>
                          <p className="text-xs text-indigo-100">Notions Score: {quizScore}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link href={isCourseIntroMode ? `/lesson/${firstCourseLessonId}` : `/lesson/${introUnit?.lessons?.[0]?.id || lesson.id}`}>
                        <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                          {isCourseIntroMode ? 'Start Lesson 1.1' : 'Start This Unit'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : currentCheckpoint ? (
                  <div className="space-y-5">
                    {isApcspCourse && (
                      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-cyan-100">AP CSP Guided Lesson Flow</p>
                          <Badge className={learningCheckPassed ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200' : 'border-amber-500/40 bg-amber-500/20 text-amber-100'}>
                            {learningCheckPassed ? 'Learning Check Passed' : 'In Progress'}
                          </Badge>
                        </div>
                        <p className="text-sm text-cyan-50">
                          Learn first, then quick check, then code. Notes below animate as you scroll to keep the explanation conversational.
                        </p>

                        <div ref={lessonFlowRef} className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-cyan-500/20 bg-slate-950/40 p-3">
                          <div
                            data-note-step={0}
                            className={`rounded-lg border border-slate-700 bg-slate-900/70 p-3 transition-all duration-500 ${
                              visibleNarrativeSteps[0] ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-40'
                            }`}
                          >
                            <p className="text-xs uppercase tracking-wide text-cyan-300">Intro Notes</p>
                            <p className="mt-1 text-sm text-slate-100">
                              In this lesson, we will connect AP CSP concepts to one small, testable Python function before moving to larger problems.
                            </p>
                          </div>
                          {sections.map((section, index) => (
                            <div
                              key={`narrative-${section.title}-${index}`}
                              data-note-step={index}
                              className={`rounded-lg border border-slate-700 bg-slate-900/70 p-3 transition-all duration-500 ${
                                visibleNarrativeSteps[index] ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-40'
                              }`}
                            >
                              <p className="text-xs uppercase tracking-wide text-cyan-300">Notes {index + 1}</p>
                              <p className="mt-1 text-sm font-semibold text-white">{section.title}</p>
                              <div className="mt-2 text-sm text-slate-200 max-h-24 overflow-hidden">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                  {section.body}
                                </ReactMarkdown>
                              </div>
                            </div>
                          ))}
                        </div>

                        {notions.length > 0 && (
                          <div className="space-y-3 rounded-lg border border-cyan-500/20 bg-slate-950/40 p-3">
                            {!hasViewedAllNarrativeSteps && (
                              <p className="text-xs text-amber-300">Scroll through all notes cards first to unlock Notions.</p>
                            )}
                            {hasViewedAllNarrativeSteps && (
                              <>
                                {notions.map((item, index) => (
                                  <div key={item.id} className="text-sm text-slate-100">
                                    <p className="mb-2 font-medium">Q{index + 1}. {item.question}</p>
                                    <div className="grid gap-1">
                                      {item.options.map((option, optionIndex) => (
                                        <label key={`${item.id}-${optionIndex}`} className="flex items-center gap-2 text-slate-200">
                                          <input
                                            type="radio"
                                            name={`quick-${item.id}`}
                                            checked={quizAnswers[item.id] === optionIndex}
                                            onChange={() => setQuizAnswers((prev) => ({ ...prev, [item.id]: optionIndex }))}
                                          />
                                          <span>{option}</span>
                                        </label>
                                      ))}
                                    </div>
                                    {quizSubmitted && (
                                      <p className={`mt-1 text-xs ${quizAnswers[item.id] === item.correctIndex ? 'text-emerald-300' : 'text-orange-300'}`}>
                                        {quizAnswers[item.id] === item.correctIndex ? 'Correct' : `Review: ${item.rationale}`}
                                      </p>
                                    )}
                                  </div>
                                ))}
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="border-cyan-500/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                                    onClick={() => void handleSubmitNotions()}
                                  >
                                    {quizSaving ? 'Saving...' : 'Grade Notions'}
                                  </Button>
                                  <p className="text-xs text-slate-300">Notions Score: {quizScore}%</p>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="flex items-center gap-2 text-base font-semibold text-white">
                          <Code2 className="h-5 w-5 text-cyan-300" />
                          {currentCheckpoint.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                            onClick={() => setCode(normalizeStarterCode(currentCheckpoint.starter_code || '', editorLanguage))}
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
                            <Badge className="border-slate-700 bg-slate-900 text-slate-200">
                              {getLanguageLabel(editorLanguage)}
                            </Badge>
                          </div>
                        </div>

                        <MonacoEditor
                          height="560px"
                          language={editorLanguage}
                          value={code}
                          onMount={onEditorMount}
                          onChange={(value) => setCode(value ?? '')}
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: true },
                            fontSize: 15,
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
                            <span>Target: {getLanguageLabel(preferredLanguage)}</span>
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
                    This lesson has no coding checkpoint yet.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="xl:col-span-3">
            <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-4 py-3">
                <p className="text-sm font-medium text-slate-200">{isIntroMode ? 'Intro Guide' : 'Assignment'}</p>
                <p className="text-xs text-slate-400">
                  {isIntroMode ? 'Overview, standards, and simple focus prompts.' : 'Checkpoint instructions and points'}
                </p>
              </div>

              {!isIntroMode && (
                <div className="border-b border-slate-800 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {checkpoints.length === 0 && (
                      <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-200">No checkpoint for this lesson</Badge>
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
              )}

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {isIntroMode ? (
                  <div className="space-y-4">
                    {isApcspCourse && frameworkOverview.length > 0 && (
                      <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 space-y-2">
                        {frameworkOverview.map((group) => (
                          <div key={group.label}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{group.label}</p>
                            <ul className="mt-1 space-y-1 text-xs text-slate-200">
                              {group.items.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">Notions (Quick Reflection)</p>
                      <ul className="mt-2 space-y-2 text-sm text-indigo-100">
                        {notions.map((item, index) => (
                          <li key={`side-notion-${item.id}`}>N{index + 1}. {item.question}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : currentCheckpoint ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                        <FileCode2 className="h-5 w-5 text-cyan-300" />
                        {currentCheckpoint.title}
                      </h3>
                      <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-200">{currentCheckpoint.points || 0} pts</Badge>
                    </div>
                    {isApcspCourse && frameworkTag && (
                      <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">AP CSP Alignment</p>
                        <p className="mt-1 text-sm text-cyan-100">{frameworkTag.unitLabel}</p>
                        <p className="mt-1 text-xs text-cyan-100">Big Ideas: {frameworkTag.bigIdeas.join(' | ')}</p>
                        <p className="mt-1 text-xs text-cyan-100">Practices: {frameworkTag.practices.join(' | ')}</p>
                      </div>
                    )}
                    {isApcspCourse && pseudocodeGuide.length > 0 && (
                      <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">Pseudocode Plan</p>
                        <ul className="mt-2 space-y-1 text-sm text-indigo-100">
                          {pseudocodeGuide.map((step, index) => (
                            <li key={`pseudo-${index}`}>{index + 1}. {step}</li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs text-indigo-200">Translate these steps into Python in the editor.</p>
                      </div>
                    )}
                    {isApcspCourse && frameworkOverview.length > 0 && (
                      <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 space-y-2">
                        {frameworkOverview.map((group) => (
                          <div key={group.label}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{group.label}</p>
                            <ul className="mt-1 space-y-1 text-xs text-slate-200">
                              {group.items.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="space-y-3 text-sm text-slate-200 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-6 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-slate-700 [&_pre]:bg-slate-900 [&_pre]:p-3 [&_strong]:text-white">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {checkpointMarkdown || 'No assignment instructions provided.'}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No assignment instructions available for this lesson.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {notesOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <button type="button" className="h-full flex-1 bg-black/60" onClick={() => setNotesOpen(false)} aria-label="Close notes" />
          <div className="h-full w-full max-w-2xl border-l border-slate-700 bg-slate-950/98 backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-200">Lesson Notes</p>
                <p className="text-xs text-slate-400">Reference content and response prompts</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                onClick={() => setNotesOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
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

            <div className="h-[calc(100%-112px)] overflow-y-auto px-5 py-5">
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
                  <p className="text-sm font-semibold text-white">Notions</p>
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
                  <p className="text-sm text-slate-400">No notion prompts were found on this notes page yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
