'use client'

import nextDynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { ArrowLeft, CheckCircle2, Code2, Loader2, Play, RotateCcw, Save, TerminalSquare } from 'lucide-react'

import { SiteBackdrop } from '@/components/site-backdrop'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  SANDBOX_LANGUAGE_OPTIONS,
  getSandboxEntryFilename,
  getSandboxStarterCode,
  type SandboxLanguage,
  type StudentSandboxRecord,
} from '@/lib/classroom-sandbox'
import { withCsrfHeaders } from '@/lib/security/csrf-client'

const MonacoEditor = nextDynamic(() => import('@monaco-editor/react'), { ssr: false })
const PYODIDE_SCRIPT_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js'
const PYODIDE_ASSET_BASE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'

type ClassroomSummary = {
  id: string
  name: string
  code: string
}

type SandboxRunResult = {
  status: 'success' | 'error' | 'timeout'
  stdout: string
  stderr: string
  exitCode: number | null
  durationMs: number
  runtime: string
}

type PyodideInstance = {
  globals: {
    get: (name: string) => unknown
    set: (name: string, value: unknown) => void
  }
  runPythonAsync: (code: string) => Promise<unknown>
}

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInstance>
    __averonPyodidePromise?: Promise<PyodideInstance>
  }
}

export default function ClassroomSandboxPage() {
  const router = useRouter()
  const params = useParams()
  const classroomId = params.id as string
  const { resolvedTheme } = useTheme()

  const [classroom, setClassroom] = useState<ClassroomSummary | null>(null)
  const [sandbox, setSandbox] = useState<StudentSandboxRecord | null>(null)
  const [language, setLanguage] = useState<SandboxLanguage>('python')
  const [entryFilename, setEntryFilename] = useState('main.py')
  const [code, setCode] = useState('')
  const [stdin, setStdin] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [saveMessage, setSaveMessage] = useState('Synced with Supabase sandbox storage.')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<SandboxRunResult | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [readyToPersist, setReadyToPersist] = useState(false)
  const [editorLoadFailed, setEditorLoadFailed] = useState(false)
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSandbox() {
      try {
        const response = await fetch(`/api/classrooms/${classroomId}/sandbox`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load sandbox')
        }
        if (cancelled) return

        const loadedSandbox = payload.sandbox as StudentSandboxRecord
        const loadedClassroom = payload.classroom as ClassroomSummary

        setClassroom(loadedClassroom)
        setSandbox(loadedSandbox)
        setLanguage('python')
        setEntryFilename(getSandboxEntryFilename('python'))
        setCode(loadedSandbox.code || getSandboxStarterCode('python', loadedClassroom?.name))
        setStdin(loadedSandbox.stdin || '')
        setLastSavedAt(loadedSandbox.updated_at || null)
        if (loadedSandbox.last_run_at) {
          setRunResult({
            status: loadedSandbox.last_run_status === 'success' ? 'success' : loadedSandbox.last_run_status === 'timeout' ? 'timeout' : 'error',
            stdout: loadedSandbox.last_run_output || '',
            stderr: loadedSandbox.last_run_error || '',
            exitCode: null,
            durationMs: loadedSandbox.last_run_duration_ms || 0,
            runtime: loadedSandbox.last_run_runtime || 'sandbox',
          })
        }
        setReadyToPersist(true)
      } catch (error: any) {
        if (!cancelled) {
          setRuntimeError(error?.message || 'Failed to load sandbox mode')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadSandbox()

    return () => {
      cancelled = true
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [classroomId])

  useEffect(() => {
    if (!readyToPersist || loading) return

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      void persistSandbox(true)
    }, 700)

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [code, stdin, language, entryFilename, readyToPersist, loading])

  const saveLabel = useMemo(() => {
    if (saving) return 'Saving...'
    if (!lastSavedAt) return saveMessage
    return `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
  }, [lastSavedAt, saveMessage, saving])

  const selectedLanguageMeta = useMemo(
    () => SANDBOX_LANGUAGE_OPTIONS.find((option) => option.value === language),
    [language],
  )
  const editorTheme = resolvedTheme === 'light' ? 'light' : 'vs-dark'

  async function persistSandbox(
    isAutosave = false,
    lastRun?: SandboxRunResult | null,
    successMessage?: string,
  ): Promise<StudentSandboxRecord | null> {
    if (!readyToPersist) return null

    setSaving(true)
    setRuntimeError(null)

    try {
      const response = await fetch(`/api/classrooms/${classroomId}/sandbox`, {
        method: 'PUT',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          language,
          code,
          stdin,
          entryFilename,
          lastRun,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save sandbox')
      }

      const savedSandbox = payload.sandbox as StudentSandboxRecord

      setSandbox(savedSandbox)
      setLastSavedAt(savedSandbox.updated_at || new Date().toISOString())
      setSaveMessage(successMessage || (isAutosave ? 'Autosaved to Supabase.' : 'Saved to Supabase.'))
      return savedSandbox
    } catch (error: any) {
      setRuntimeError(error?.message || 'Failed to save sandbox')
      setSaveMessage('Save failed.')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function handleRun() {
    setRunning(true)
    setRuntimeError(null)

    try {
      const response = await fetch(`/api/classrooms/${classroomId}/sandbox/run`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          language,
          code,
          stdin,
          entryFilename,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to run sandbox')
      }

      setRunResult(payload.result as SandboxRunResult)
      setSandbox(payload.sandbox as StudentSandboxRecord)
      setLastSavedAt((payload.sandbox as StudentSandboxRecord).updated_at || new Date().toISOString())
      setSaveMessage('Run synced to Supabase.')
    } catch (error: any) {
      const message = error?.message || 'Failed to run sandbox'

      if (shouldUseBrowserPythonFallback(message)) {
        try {
          const browserResult = await runPythonInBrowser(code, stdin)
          const savedSandbox = await persistSandbox(
            false,
            browserResult,
            'Server runtime unavailable, so this run executed in your browser and synced to Supabase.',
          )

          setRunResult(browserResult)
          if (savedSandbox) {
            setSandbox(savedSandbox)
            setLastSavedAt(savedSandbox.updated_at || new Date().toISOString())
          }
          return
        } catch (browserError: any) {
          setRuntimeError(browserError?.message || message)
          return
        }
      }

      setRuntimeError(message)
    } finally {
      setRunning(false)
    }
  }

  function loadStarterForLanguage() {
    setLanguage('python')
    setEntryFilename(getSandboxEntryFilename('python'))
    setCode(getSandboxStarterCode('python', classroom?.name))
    setRunResult(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen warm-aurora">
        <SiteBackdrop />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="site-panel flex items-center gap-3 px-6 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading sandbox mode...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen warm-aurora text-foreground">
      <SiteBackdrop />

      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/78 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/ACL.png" alt="Averon CodeLab" width={36} height={36} className="h-9 w-9 logo-theme-filter" />
              <div>
                <p className="text-sm font-semibold">Averon CodeLab</p>
                <p className="text-xs text-muted-foreground">Classroom Sandbox</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/classroom/${classroomId}`}>
              <Button variant="outline" size="sm">
                Back to Class
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => loadStarterForLanguage()}>
              <RotateCcw className="h-4 w-4" />
              Reset Starter
            </Button>
            <Button variant="outline" size="sm" onClick={() => void persistSandbox(false)} disabled={saving}>
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button size="sm" onClick={handleRun} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-5">
            <div className="site-kicker">
              <span className="h-px w-5 bg-primary" />
              Sandbox Mode
            </div>
            <div className="space-y-3">
              <h1 className="site-title">
                Private coding playground for {classroom?.name || 'your class'}.
              </h1>
              <p className="site-subtitle max-w-2xl">
                Every enrolled student gets a personal sandbox for each class. Code is persisted to Supabase, and runs can
                execute on the server when available or fall back to an in-browser Python runtime when needed.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge className="border-primary/30 bg-primary/10 text-primary">Class Code: {classroom?.code || 'N/A'}</Badge>
              <Badge variant="outline" className="border-border/70 bg-background/70">
                Python
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background/70">
                {saveLabel}
              </Badge>
            </div>
          </div>

          <div className="site-panel p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <TerminalSquare className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Sandbox guarantees</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Each class gets its own saved workspace and stdin history.</li>
                  <li>Runs save the latest output, runtime, and status back to Supabase.</li>
                  <li>Python starter code and a Python-only runtime keep each classroom experience consistent.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.75fr_0.95fr]">
          <div className="site-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
              <div>
                <p className="text-sm font-semibold">{entryFilename}</p>
                <p className="text-xs text-muted-foreground">{selectedLanguageMeta?.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="border-primary/30 bg-primary/10 text-primary">Python Only</Badge>
              </div>
            </div>
            {editorLoadFailed ? (
              <textarea
                value={code}
                onChange={(event) => setCode(event.target.value)}
                spellCheck={false}
                className="h-[620px] w-full resize-none border-0 bg-background/80 px-4 py-4 font-mono text-sm text-foreground outline-none"
              />
            ) : (
              <MonacoEditor
                height="620px"
                language="python"
                value={code}
                onChange={(value) => setCode(value ?? '')}
                onMount={() => setEditorLoadFailed(false)}
                loading={
                  <div className="flex h-[620px] items-center justify-center text-sm text-muted-foreground">
                    Loading code editor...
                  </div>
                }
                theme={editorTheme}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  automaticLayout: true,
                  wordWrap: 'on',
                  smoothScrolling: true,
                  tabSize: 2,
                  padding: { top: 16 },
                }}
              />
            )}
            {editorLoadFailed && (
              <div className="border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
                Monaco is unavailable in this session, so a plain text editor is being used instead.
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="site-panel p-5">
              <div className="mb-3 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Runtime Input</h2>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">Pass optional stdin to your script for quick experiments.</p>
              <textarea
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                placeholder="Type stdin here..."
                className="min-h-32 w-full rounded-xl border border-border/70 bg-background/75 px-3 py-3 font-mono text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground/70"
              />
            </div>

            <div className="site-panel p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">Last Run</h2>
                </div>
                {runResult?.status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              </div>

              {runtimeError && (
                <div className="mb-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {runtimeError}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                  <p className="mt-2 text-sm font-semibold capitalize">{runResult?.status || sandbox?.last_run_status || 'Not run yet'}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Runtime</p>
                  <p className="mt-2 text-sm font-semibold">{runResult?.runtime || sandbox?.last_run_runtime || 'Pending'}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border/70 bg-slate-950 p-4 text-sm text-slate-100">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Output</p>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words font-mono">
                  {runResult?.stdout || sandbox?.last_run_output || 'No stdout yet.'}
                  {(runResult?.stderr || sandbox?.last_run_error) &&
                    `\n\n${runResult?.stderr || sandbox?.last_run_error}`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function shouldUseBrowserPythonFallback(message: string): boolean {
  const normalizedMessage = message.toLowerCase()

  return (
    normalizedMessage.includes('sandbox runtime "python3" is not available on this server') ||
    normalizedMessage.includes('sandbox execution is not configured') ||
    normalizedMessage.includes('install python3 for local execution')
  )
}

async function runPythonInBrowser(code: string, stdin: string): Promise<SandboxRunResult> {
  const pyodide = await ensurePyodideLoaded()
  const startedAt = performance.now()

  pyodide.globals.set('__averon_code', code)
  pyodide.globals.set('__averon_stdin', stdin)

  await pyodide.runPythonAsync(`
import builtins
import contextlib
import io
import traceback

_stdout_capture = io.StringIO()
_stderr_capture = io.StringIO()
_stdin_lines = __averon_stdin.splitlines()
_stdin_index = 0

def _averon_input(prompt=""):
    global _stdin_index
    if prompt:
        print(prompt, end="", file=_stdout_capture)
    if _stdin_index < len(_stdin_lines):
        value = _stdin_lines[_stdin_index]
        _stdin_index += 1
        return value
    raise EOFError("EOF when reading a line")

builtins.input = _averon_input
_globals = {"__name__": "__main__"}
_status = "success"

try:
    with contextlib.redirect_stdout(_stdout_capture), contextlib.redirect_stderr(_stderr_capture):
        exec(__averon_code, _globals)
except Exception:
    _status = "error"
    traceback.print_exc(file=_stderr_capture)

__averon_status = _status
__averon_stdout = _stdout_capture.getvalue()
__averon_stderr = _stderr_capture.getvalue()
  `)

  return {
    status: readPyodideString(pyodide, '__averon_status') === 'success' ? 'success' : 'error',
    stdout: readPyodideString(pyodide, '__averon_stdout'),
    stderr: readPyodideString(pyodide, '__averon_stderr'),
    exitCode: null,
    durationMs: Math.round(performance.now() - startedAt),
    runtime: 'browser-python',
  }
}

async function ensurePyodideLoaded(): Promise<PyodideInstance> {
  if (typeof window === 'undefined') {
    throw new Error('Browser Python fallback is only available in the classroom sandbox page.')
  }

  if (!window.__averonPyodidePromise) {
    window.__averonPyodidePromise = (async () => {
      if (!window.loadPyodide) {
        await loadExternalScript(PYODIDE_SCRIPT_URL)
      }

      if (!window.loadPyodide) {
        throw new Error('Unable to load the browser Python runtime for sandbox mode.')
      }

      return window.loadPyodide({ indexURL: PYODIDE_ASSET_BASE_URL })
    })()
  }

  try {
    return await window.__averonPyodidePromise
  } catch (error) {
    window.__averonPyodidePromise = undefined
    throw error
  }
}

async function loadExternalScript(src: string): Promise<void> {
  const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
  if (existingScript) {
    await waitForScript(existingScript)
    return
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error('Unable to load the browser Python runtime for sandbox mode.'))
    document.head.appendChild(script)
  })
}

async function waitForScript(script: HTMLScriptElement): Promise<void> {
  if (script.dataset.loaded === 'true') return

  await new Promise<void>((resolve, reject) => {
    const handleLoad = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    const handleError = () => reject(new Error('Unable to load the browser Python runtime for sandbox mode.'))

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
  })
}

function readPyodideString(pyodide: PyodideInstance, key: string): string {
  const value = pyodide.globals.get(key)

  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object' && 'toString' in value && typeof value.toString === 'function') {
    return value.toString()
  }

  return value == null ? '' : String(value)
}
