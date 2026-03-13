import { spawn } from 'node:child_process'
import vm from 'node:vm'
import { type JudgeTestCase } from '@/lib/judge/shared'

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
    if (isLocalJudgeEnabled()) {
      return runLocalJudge(payload)
    }
    throw new Error('Judge service is not configured. Set JUDGE_SERVICE_URL or explicitly enable the local judge for isolated development.')
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

function isLocalJudgeEnabled(): boolean {
  return process.env.LOCAL_JUDGE_ENABLED === 'true'
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
  const results = payload.tests.map((test) => {
    try {
      if (functionName) {
        const context = vm.createContext({})
        new vm.Script(payload.code).runInContext(context, { timeout: 500 })
        const candidate = (context as Record<string, unknown>)[functionName]

        if (typeof candidate === 'function') {
          const fn = candidate as (...args: any[]) => any
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
        }
      }

      const actualOutput = captureJavaScriptStdout(payload.code).trim()
      const expectedOutput = String(test.expected || '').trim()
      return {
        id: test.id,
        name: test.name,
        passed: actualOutput === expectedOutput,
        expected: expectedOutput,
        actual: actualOutput,
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

  const runner = `
import builtins
import contextlib
import io
import json
import traceback
import sys
import types

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

fn_name = payload.get("function_name")
fn = namespace.get(fn_name) if fn_name else None

if not callable(fn):
    # Fallback: discover the first user-defined function in globals.
    discovered = [
        (name, value) for name, value in namespace.items()
        if isinstance(value, types.FunctionType) and not name.startswith("_")
    ]
    if discovered:
        fn_name, fn = discovered[0]

def run_program(raw_input):
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    stdin_lines = str(raw_input or "").splitlines()
    stdin_index = 0

    def fake_input(prompt=""):
        nonlocal stdin_index
        if prompt:
            print(prompt, end="", file=stdout_capture)
        if stdin_index < len(stdin_lines):
            value = stdin_lines[stdin_index]
            stdin_index += 1
            return value
        raise EOFError("EOF when reading a line")

    original_input = builtins.input
    try:
        builtins.input = fake_input
        with contextlib.redirect_stdout(stdout_capture), contextlib.redirect_stderr(stderr_capture):
            exec(payload["code"], {"__name__": "__main__"})
        return stdout_capture.getvalue().strip(), stderr_capture.getvalue().strip(), None
    except Exception:
        return stdout_capture.getvalue().strip(), stderr_capture.getvalue().strip(), traceback.format_exc()
    finally:
        builtins.input = original_input

for t in payload["tests"]:
    try:
        if callable(fn):
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
        else:
            stdout, stderr, error = run_program(t["input"])
            expected_output = str(t["expected"]).strip()
            actual_output = str(stdout or "").strip()
            results.append({
                "id": t["id"],
                "name": t["name"],
                "passed": error is None and actual_output == expected_output,
                "expected": expected_output,
                "actual": actual_output,
                "error": error or (stderr if stderr else None)
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
    function_name: functionName || undefined,
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
    // Accept common Python forms, including line breaks before "(".
    const match = code.match(/(?:^|\s)(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(|\n)/m)
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

function captureJavaScriptStdout(code: string): string {
  let stdout = ''
  const context = vm.createContext({
    console: {
      log: (...args: unknown[]) => {
        stdout += `${args.map((value) => String(value)).join(' ')}\n`
      },
    },
  })
  new vm.Script(code).runInContext(context, { timeout: 500 })
  return stdout
}
