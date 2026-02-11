type JudgeTestCase = {
  id: string
  name: string
  input: string
  expected: string
  hidden?: boolean
}

type JudgeResultCase = {
  id: string
  name: string
  passed: boolean
  expected: string
  actual: string
  error?: string | null
}

type JudgeResponse = {
  results: JudgeResultCase[]
}

export type JudgeRunRequest = {
  language: string
  code: string
  tests: JudgeTestCase[]
  context: {
    source: 'assignment' | 'checkpoint'
    sourceId: string
    userId: string
  }
}

export async function runSandboxJudge(payload: JudgeRunRequest): Promise<JudgeResponse> {
  const judgeUrl = process.env.JUDGE_SERVICE_URL
  if (!judgeUrl) {
    throw new Error('Judge service is not configured')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const judgeToken = process.env.JUDGE_SERVICE_TOKEN
  if (judgeToken) {
    headers['Authorization'] = `Bearer ${judgeToken}`
  }

  const response = await fetch(judgeUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Judge service failed (${response.status}): ${message || 'Unknown error'}`)
  }

  const data = (await response.json()) as Partial<JudgeResponse>
  if (!Array.isArray(data.results)) {
    throw new Error('Judge service returned invalid payload')
  }

  return {
    results: data.results.map((result, index) => ({
      id: typeof result?.id === 'string' ? result.id : String(index),
      name: typeof result?.name === 'string' ? result.name : `Test ${index + 1}`,
      passed: Boolean(result?.passed),
      expected: String(result?.expected ?? ''),
      actual: String(result?.actual ?? ''),
      error: result?.error ? String(result.error) : null,
    })),
  }
}

export function normalizeTestCases(raw: unknown): JudgeTestCase[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((test, index) => {
      const item = (test ?? {}) as Record<string, unknown>
      return {
        id: String(item.id ?? index),
        name: String(item.name ?? `Test ${index + 1}`),
        input: String(item.input ?? ''),
        expected: String(item.expected ?? item.expected_output ?? ''),
        hidden: Boolean(item.hidden),
      }
    })
    .filter((test) => test.expected.length > 0 || test.input.length > 0)
}

export function inferLanguage(input: { code?: string | null; starterCode?: string | null; language?: string | null }): string {
  if (input.language && input.language.trim()) return input.language.trim().toLowerCase()

  const source = `${input.code || ''}\n${input.starterCode || ''}`.toLowerCase()
  if (/\b(def |import |print\()/.test(source)) return 'python'
  if (/\b(function |const |let |=>|console\.log)/.test(source)) return 'javascript'
  if (/\bpublic class |system\.out\.println/.test(source)) return 'java'
  if (/\b#include|std::|cout\s*<</.test(source)) return 'cpp'
  return 'python'
}
