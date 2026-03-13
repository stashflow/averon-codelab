export type JudgeTestCase = {
  id: string
  name: string
  input: string
  expected: string
  hidden?: boolean
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
