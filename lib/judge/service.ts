import { spawn } from 'node:child_process'
import vm from 'node:vm'

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
    if (process.env.NODE_ENV !== 'production') {
      return runLocalJudge(payload)
    }
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

async function runLocalJudge(payload: JudgeRunRequest): Promise<JudgeResponse> {
  if (payload.language === 'javascript' || payload.language === 'js') {
    return runLocalJavaScriptJudge(payload)
  }

  if (payload.language === 'python' || payload.language === 'py') {
    return runLocalPythonJudge(payload)
  }

  throw new Error(`Local judge does not support language: ${payload.language}`)
}

function runLocalJavaScriptJudge(payload: JudgeRunRequest): JudgeResponse {
  const functionName = inferFunctionName(payload.code, 'javascript')
  if (!functionName) {
    throw new Error('Could not find a JavaScript function to test')
  }

  const context = vm.createContext({})
  new vm.Script(payload.code).runInContext(context, { timeout: 500 })
  const candidate = (context as Record<string, unknown>)[functionName]
  if (typeof candidate !== 'function') {
    throw new Error(`Function "${functionName}" was not found`)
  }

  const fn = candidate as (...args: any[]) => any
  const results = payload.tests.map((test) => {
    try {
      const args = parseInputArgs(test.input)
      const expected = parseLiteral(test.expected)
      const actual = fn(...args)
      const passed = deepEqual(actual, expected)
      return {
        id: test.id,
        name: test.name,
        passed,
        expected: stringifyValue(expected),
        actual: stringifyValue(actual),
        error: null,
      }
    } catch (error: any) {
      return {
        id: test.id,
        name: test.name,
        passed: false,
        expected: test.expected,
        actual: '',
        error: error?.message || 'Execution failed',
      }
    }
  })

  return { results }
}

async function runLocalPythonJudge(payload: JudgeRunRequest): Promise<JudgeResponse> {
  const functionName = inferFunctionName(payload.code, 'python')
  if (!functionName) {
    throw new Error('Could not find a Python function to test')
  }

  const runner = `
import json
import traceback
import sys

payload = json.loads(sys.stdin.read())
namespace = {}
results = []

try:
    exec(payload["code"], namespace)
except Exception as e:
    message = traceback.format_exc()
    for t in payload["tests"]:
        results.append({
            "id": t["id"],
            "name": t["name"],
            "passed": False,
            "expected": t["expected"],
            "actual": "",
            "error": message
        })
    print(json.dumps({"results": results}))
    sys.exit(0)

fn = namespace.get(payload["function_name"])
if not callable(fn):
    for t in payload["tests"]:
        results.append({
            "id": t["id"],
            "name": t["name"],
            "passed": False,
            "expected": t["expected"],
            "actual": "",
            "error": f'Function "{payload["function_name"]}" was not found'
        })
    print(json.dumps({"results": results}))
    sys.exit(0)

for t in payload["tests"]:
    try:
        args = t["args"]
        expected = t["expected_parsed"]
        actual = fn(*args)
        passed = actual == expected
        results.append({
            "id": t["id"],
            "name": t["name"],
            "passed": bool(passed),
            "expected": json.dumps(expected),
            "actual": json.dumps(actual),
            "error": None
        })
    except Exception as e:
        results.append({
            "id": t["id"],
            "name": t["name"],
            "passed": False,
            "expected": t["expected"],
            "actual": "",
            "error": traceback.format_exc()
        })

print(json.dumps({"results": results}))
`

  const localPayload = {
    code: payload.code,
    function_name: functionName,
    tests: payload.tests.map((test) => ({
      id: test.id,
      name: test.name,
      expected: test.expected,
      expected_parsed: parseLiteral(test.expected),
      args: parseInputArgs(test.input),
    })),
  }

  const stdout = await runPython(runner, JSON.stringify(localPayload))
  const parsed = JSON.parse(stdout) as JudgeResponse
  return {
    results: parsed.results.map((result) => ({
      id: String(result.id),
      name: String(result.name),
      passed: Boolean(result.passed),
      expected: String(result.expected ?? ''),
      actual: String(result.actual ?? ''),
      error: result.error ? String(result.error) : null,
    })),
  }
}

function runPython(script: string, stdin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['-c', script], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let out = ''
    let err = ''
    child.stdout.on('data', (data) => {
      out += data.toString()
    })
    child.stderr.on('data', (data) => {
      err += data.toString()
    })

    const timeout = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('Local Python judge timed out'))
    }, 3000)

    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        reject(new Error(err || `Python exited with code ${code}`))
        return
      }
      resolve(out)
    })

    child.stdin.write(stdin)
    child.stdin.end()
  })
}

function inferFunctionName(code: string, language: 'python' | 'javascript'): string | null {
  if (language === 'python') {
    const match = code.match(/def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/)
    return match?.[1] || null
  }
  const jsFnMatch = code.match(/function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/)
  if (jsFnMatch?.[1]) return jsFnMatch[1]
  const arrowMatch = code.match(/(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(/)
  return arrowMatch?.[1] || null
}

function parseInputArgs(input: string): unknown[] {
  const raw = (input || '').trim()
  if (!raw) return []

  const parts = splitTopLevel(raw)
  // If it's a single JSON array argument like [1,2,3], keep as one arg.
  if (parts.length === 1 && raw.startsWith('[') && raw.endsWith(']')) {
    return [parseLiteral(raw)]
  }
  return parts.map((part) => parseLiteral(part))
}

function splitTopLevel(value: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  let quote: '"' | "'" | null = null
  let escaped = false

  for (const char of value) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === '\\') {
      current += char
      escaped = true
      continue
    }
    if (quote) {
      current += char
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'") {
      quote = char as '"' | "'"
      current += char
      continue
    }
    if (char === '[' || char === '{' || char === '(') {
      depth += 1
      current += char
      continue
    }
    if (char === ']' || char === '}' || char === ')') {
      depth = Math.max(0, depth - 1)
      current += char
      continue
    }
    if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  if (current.trim()) parts.push(current.trim())
  return parts
}

function parseLiteral(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    return JSON.parse(trimmed)
  } catch {}

  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  if (!Number.isNaN(Number(trimmed))) return Number(trimmed)

  return trimmed
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function stringifyValue(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
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
