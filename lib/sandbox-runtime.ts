import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

import { normalizeSandboxLanguage, type SandboxLanguage } from '@/lib/classroom-sandbox'

type SandboxExecutionRequest = {
  language: SandboxLanguage
  code: string
  stdin?: string
  entryFilename?: string
  files?: Array<{ path: string; content: string }>
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
    'Sandbox execution is not configured. Set SANDBOX_EXECUTION_URL or install python3 for local execution.',
  )
}

function isLocalSandboxEnabled(): boolean {
  return process.env.LOCAL_SANDBOX_EXECUTION_ENABLED !== 'false'
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
      entryFilename: input.entryFilename || 'main.py',
      files: input.files || [],
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
  normalizeSandboxLanguage(input.language)
  return runLocalPythonWorkspace(input)
}

function runLocalProcess(
  command: string,
  args: string[],
  stdin: string,
  runtime: string,
  cwd?: string,
): Promise<SandboxExecutionResult> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
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
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error(`Sandbox runtime "${command}" is not available on this server.`))
        return
      }
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

async function runLocalPythonWorkspace(input: SandboxExecutionRequest): Promise<SandboxExecutionResult> {
  const workspaceDir = await mkdtemp(join(tmpdir(), 'averon-sandbox-'))
  const entryFilename = normalizeEntryFilename(input.entryFilename)
  const files = normalizeWorkspaceFiles(input.files, input.code, entryFilename)

  try {
    for (const file of files) {
      const targetPath = join(workspaceDir, file.path)
      await mkdir(dirname(targetPath), { recursive: true })
      await writeFile(targetPath, file.content, 'utf8')
    }

    return await runLocalProcess('python3', [entryFilename], input.stdin || '', 'local-python', workspaceDir)
  } finally {
    await rm(workspaceDir, { recursive: true, force: true })
  }
}

function normalizeEntryFilename(entryFilename?: string): string {
  return String(entryFilename || 'main.py').trim().replace(/^\/+/, '') || 'main.py'
}

function normalizeWorkspaceFiles(
  files: Array<{ path: string; content: string }> | undefined,
  code: string,
  entryFilename: string,
) {
  const normalized = Array.isArray(files)
    ? files
        .map((file) => ({
          path: normalizeEntryFilename(file.path),
          content: String(file.content || ''),
        }))
        .filter((file) => file.path.endsWith('.py'))
    : []

  if (!normalized.some((file) => file.path === entryFilename)) {
    normalized.push({ path: entryFilename, content: code })
  }

  return normalized
}
