import { spawn } from 'node:child_process'

import { normalizeSandboxLanguage, type SandboxLanguage } from '@/lib/classroom-sandbox'

type SandboxExecutionRequest = {
  language: SandboxLanguage
  code: string
  stdin?: string
}

export type SandboxExecutionResult = {
  status: 'success' | 'error' | 'timeout'
  stdout: string
  stderr: string
  exitCode: number | null
  durationMs: number
  runtime: string
}

export async function runSandboxExecution(input: SandboxExecutionRequest): Promise<SandboxExecutionResult> {
  const remoteUrl = process.env.SANDBOX_EXECUTION_URL || process.env.JUDGE_SANDBOX_URL
  if (remoteUrl) {
    return runRemoteSandboxExecution(remoteUrl, input)
  }

  if (isLocalSandboxEnabled()) {
    return runLocalSandboxExecution(input)
  }

  throw new Error(
    'Sandbox execution is not configured. Set SANDBOX_EXECUTION_URL or enable LOCAL_SANDBOX_EXECUTION_ENABLED.',
  )
}

function isLocalSandboxEnabled(): boolean {
  return process.env.LOCAL_SANDBOX_EXECUTION_ENABLED === 'true' || process.env.NODE_ENV !== 'production'
}

async function runRemoteSandboxExecution(
  remoteUrl: string,
  input: SandboxExecutionRequest,
): Promise<SandboxExecutionResult> {
  const response = await fetch(remoteUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: input.language,
      code: input.code,
      stdin: input.stdin || '',
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Sandbox runtime failed (${response.status}): ${message || 'Unknown error'}`)
  }

  const payload = (await response.json()) as Partial<SandboxExecutionResult>

  if (!payload || typeof payload.status !== 'string') {
    throw new Error('Sandbox runtime returned an invalid payload')
  }

  return {
    status: payload.status === 'timeout' ? 'timeout' : payload.status === 'success' ? 'success' : 'error',
    stdout: String(payload.stdout || ''),
    stderr: String(payload.stderr || ''),
    exitCode: typeof payload.exitCode === 'number' ? payload.exitCode : null,
    durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : 0,
    runtime: String(payload.runtime || 'remote'),
  }
}

async function runLocalSandboxExecution(input: SandboxExecutionRequest): Promise<SandboxExecutionResult> {
  const language = normalizeSandboxLanguage(input.language)

  if (language === 'javascript') {
    return runLocalProcess('node', ['-e', input.code], input.stdin || '', 'local-node')
  }

  return runLocalProcess('python3', ['-c', input.code], input.stdin || '', 'local-python')
}

function runLocalProcess(
  command: string,
  args: string[],
  stdin: string,
  runtime: string,
): Promise<SandboxExecutionResult> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let timedOut = false

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
      if (stdout.length > 20_000) {
        stdout = `${stdout.slice(0, 20_000)}\n...output truncated...`
      }
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
      if (stderr.length > 20_000) {
        stderr = `${stderr.slice(0, 20_000)}\n...error output truncated...`
      }
    })

    child.on('error', (error) => {
      reject(error)
    })

    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, 4000)

    child.on('close', (code) => {
      clearTimeout(timeout)
      const durationMs = Date.now() - startedAt
      resolve({
        status: timedOut ? 'timeout' : code === 0 ? 'success' : 'error',
        stdout,
        stderr,
        exitCode: typeof code === 'number' ? code : null,
        durationMs,
        runtime,
      })
    })

    if (stdin) {
      child.stdin.write(stdin)
    }
    child.stdin.end()
  })
}
