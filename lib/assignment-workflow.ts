export type AssignmentWindow = {
  is_visible?: boolean | null
  visible_from?: string | null
  visible_until?: string | null
  due_date?: string | null
}

export type AssignmentAvailabilityState = 'open' | 'scheduled' | 'hidden' | 'closed'

export type AssignmentAvailability = {
  state: AssignmentAvailabilityState
  label: string
  detail: string | null
  visibleFrom: Date | null
  visibleUntil: Date | null
  dueDate: Date | null
}

export type QuizQuestion = {
  prompt: string
  options: string[]
  correctIndex: number
  explanation?: string
  points?: number
}

export type QuizSubmissionPayload = {
  answers?: number[]
}

export type QuizAutoGradeSummary = {
  score: number
  feedback: string
  earned: number
  possible: number
  lineItems: Array<{
    label: string
    correct: boolean
    points: number
  }>
}

export type JudgeFeedbackResult = {
  passed: boolean
  name?: string
  expected?: string
  actual?: string
  error?: string | null
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getAssignmentAvailability(input: AssignmentWindow, now = new Date()): AssignmentAvailability {
  const visibleFrom = parseDate(input.visible_from)
  const visibleUntil = parseDate(input.visible_until)
  const dueDate = parseDate(input.due_date)
  const isVisible = input.is_visible !== false

  if (!isVisible) {
    return {
      state: 'hidden',
      label: 'Hidden',
      detail: 'This assignment is currently hidden by your teacher.',
      visibleFrom,
      visibleUntil,
      dueDate,
    }
  }

  if (visibleFrom && visibleFrom.getTime() > now.getTime()) {
    return {
      state: 'scheduled',
      label: 'Scheduled',
      detail: `Opens ${visibleFrom.toLocaleString()}.`,
      visibleFrom,
      visibleUntil,
      dueDate,
    }
  }

  if (visibleUntil && visibleUntil.getTime() < now.getTime()) {
    return {
      state: 'closed',
      label: 'Closed',
      detail: `Closed ${visibleUntil.toLocaleString()}.`,
      visibleFrom,
      visibleUntil,
      dueDate,
    }
  }

  return {
    state: 'open',
    label: dueDate && dueDate.getTime() < now.getTime() ? 'Past Due' : 'Open',
    detail: dueDate ? `Due ${dueDate.toLocaleString()}.` : null,
    visibleFrom,
    visibleUntil,
    dueDate,
  }
}

export function parseQuizQuestions(testCases: unknown): QuizQuestion[] {
  if (!Array.isArray(testCases)) return []
  return testCases
    .map((item: any) => ({
      prompt: String(item?.prompt || ''),
      options: Array.isArray(item?.options) ? item.options.map((option: unknown) => String(option || '')) : [],
      correctIndex: Number.isFinite(Number(item?.correctIndex)) ? Number(item.correctIndex) : 0,
      explanation: String(item?.explanation || ''),
      points: Number.isFinite(Number(item?.points)) ? Number(item.points) : 1,
    }))
    .filter((item) => item.prompt && item.options.length >= 2)
}

export function parseQuizSubmission(code: string | null | undefined): QuizSubmissionPayload {
  try {
    return JSON.parse(String(code || '{}')) as QuizSubmissionPayload
  } catch {
    return {}
  }
}

export function autoGradeQuizSubmission(
  questions: QuizQuestion[],
  payload: QuizSubmissionPayload,
): QuizAutoGradeSummary {
  const answers = Array.isArray(payload.answers) ? payload.answers : []
  let earned = 0
  let possible = 0

  const lineItems = questions.map((question, index) => {
    const points = Math.max(1, Number(question.points) || 1)
    possible += points
    const selected = Number.isFinite(Number(answers[index])) ? Number(answers[index]) : -1
    const correct = selected === question.correctIndex
    if (correct) earned += points
    return {
      label: `Q${index + 1}`,
      correct,
      points,
    }
  })

  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0
  const feedback = `Auto-graded quiz. ${lineItems.map((item) => `${item.correct ? 'Correct' : 'Incorrect'} ${item.label}`).join(' | ')}`
  return { score, feedback, earned, possible, lineItems }
}

export function buildJudgeFeedback(
  results: JudgeFeedbackResult[],
  score: number,
  allTestsCount?: number,
): string {
  const visiblePassed = results.filter((result) => result.passed).length
  const visibleTotal = results.length
  const hiddenCount = typeof allTestsCount === 'number' && allTestsCount > visibleTotal ? allTestsCount - visibleTotal : 0

  const headline =
    visibleTotal > 0
      ? `Auto-graded coding assignment. Passed ${visiblePassed} of ${visibleTotal} visible tests for ${score}%.`
      : `Auto-graded coding assignment. Score: ${score}%.`

  const failures = results
    .filter((result) => !result.passed)
    .slice(0, 2)
    .map((result) => {
      if (result.error) return `${result.name || 'Test'}: ${result.error}`
      return `${result.name || 'Test'} expected ${result.expected ?? 'n/a'} but got ${result.actual ?? 'n/a'}.`
    })

  const hiddenNote = hiddenCount > 0 ? ` Hidden checks were also applied.` : ''
  const failureNote = failures.length > 0 ? ` Focus next on ${failures.join(' ')}` : ' All visible checks passed.'

  return `${headline}${hiddenNote}${failureNote}`.trim()
}
