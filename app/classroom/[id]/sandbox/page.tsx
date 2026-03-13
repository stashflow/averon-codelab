'use client'

import nextDynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, Code2, Loader2, Play, RotateCcw, Save, TerminalSquare } from 'lucide-react'

import { SiteBackdrop } from '@/components/site-backdrop'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  SANDBOX_LANGUAGE_OPTIONS,
  getSandboxEntryFilename,
  getSandboxStarterCode,
  normalizeSandboxLanguage,
  type SandboxLanguage,
  type StudentSandboxRecord,
} from '@/lib/classroom-sandbox'
import { withCsrfHeaders } from '@/lib/security/csrf-client'

const MonacoEditor = nextDynamic(() => import('@monaco-editor/react'), { ssr: false })

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

export default function ClassroomSandboxPage() {
  const router = useRouter()
  const params = useParams()
  const classroomId = params.id as string

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
        setLanguage(normalizeSandboxLanguage(loadedSandbox.language))
        setEntryFilename(loadedSandbox.entry_filename || getSandboxEntryFilename(normalizeSandboxLanguage(loadedSandbox.language)))
        setCode(loadedSandbox.code || getSandboxStarterCode(normalizeSandboxLanguage(loadedSandbox.language), loadedClassroom?.name))
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

  async function persistSandbox(isAutosave = false) {
    if (!readyToPersist) return

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
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save sandbox')
      }

      setSandbox(payload.sandbox as StudentSandboxRecord)
      setLastSavedAt((payload.sandbox as StudentSandboxRecord).updated_at || new Date().toISOString())
      setSaveMessage(isAutosave ? 'Autosaved to Supabase.' : 'Saved to Supabase.')
    } catch (error: any) {
      setRuntimeError(error?.message || 'Failed to save sandbox')
      setSaveMessage('Save failed.')
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
      setRuntimeError(error?.message || 'Failed to run sandbox')
    } finally {
      setRunning(false)
    }
  }

  function loadStarterForLanguage(nextLanguage: SandboxLanguage) {
    setLanguage(nextLanguage)
    setEntryFilename(getSandboxEntryFilename(nextLanguage))
    setCode(getSandboxStarterCode(nextLanguage, classroom?.name))
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
            <Button variant="outline" size="sm" onClick={() => loadStarterForLanguage(language)}>
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
                execute locally in development or through a configured remote runtime.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge className="border-primary/30 bg-primary/10 text-primary">Class Code: {classroom?.code || 'N/A'}</Badge>
              <Badge variant="outline" className="border-border/70 bg-background/70">
                {selectedLanguageMeta?.label || 'Python'}
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
                  <li>Python and JavaScript starters are included for quick experimentation.</li>
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
                {SANDBOX_LANGUAGE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={option.value === language ? 'default' : 'outline'}
                    onClick={() => loadStarterForLanguage(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            <MonacoEditor
              height="620px"
              language={language}
              value={code}
              onChange={(value) => setCode(value ?? '')}
              theme="vs-dark"
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
