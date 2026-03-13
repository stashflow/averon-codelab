'use client'

import nextDynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  ArrowLeft,
  CheckCircle2,
  FilePlus2,
  FolderKanban,
  LayoutPanelLeft,
  LayoutTemplate,
  Loader2,
  Play,
  RotateCcw,
  Save,
  TerminalSquare,
} from 'lucide-react'

import { SiteBackdrop } from '@/components/site-backdrop'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Switch } from '@/components/ui/switch'
import {
  SANDBOX_LANGUAGE_OPTIONS,
  getDefaultSandboxFiles,
  getSandboxEntryFilename,
  getSandboxStarterCode,
  normalizeSandboxFiles,
  type StudentSandboxFile,
  type SandboxLanguage,
  type StudentSandboxRecord,
} from '@/lib/classroom-sandbox'
import {
  type BrowserPythonFile,
} from '@/lib/client/browser-python'
import { usePythonLiveRuntime } from '@/lib/client/use-python-live-runtime'
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
  const { resolvedTheme } = useTheme()

  const [classroom, setClassroom] = useState<ClassroomSummary | null>(null)
  const [sandbox, setSandbox] = useState<StudentSandboxRecord | null>(null)
  const [language, setLanguage] = useState<SandboxLanguage>('python')
  const [projectName, setProjectName] = useState('Class Sandbox Project')
  const [workspaceFiles, setWorkspaceFiles] = useState<StudentSandboxFile[]>(getDefaultSandboxFiles('python'))
  const [activeFile, setActiveFile] = useState('main.py')
  const [entryFilename, setEntryFilename] = useState('main.py')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('Synced with Supabase sandbox storage.')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<SandboxRunResult | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [easyMode, setEasyMode] = useState(true)
  const [terminalOpen, setTerminalOpen] = useState(true)
  const [readyToPersist, setReadyToPersist] = useState(false)
  const [editorLoadFailed, setEditorLoadFailed] = useState(false)
  const saveTimerRef = useRef<number | null>(null)
  const liveRuntime = usePythonLiveRuntime()

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
        const normalizedFiles = normalizeSandboxFiles(loadedSandbox.workspace_files, loadedClassroom?.name)
        const resolvedEntry = loadedSandbox.entry_filename || getSandboxEntryFilename('python')
        const resolvedActiveFile = loadedSandbox.active_file || resolvedEntry
        const activeFileRecord =
          normalizedFiles.find((file) => file.path === resolvedActiveFile) ||
          normalizedFiles.find((file) => file.path === resolvedEntry) ||
          normalizedFiles[0]

        setProjectName(loadedSandbox.project_name || 'Class Sandbox Project')
        setWorkspaceFiles(normalizedFiles)
        setActiveFile(activeFileRecord?.path || resolvedActiveFile)
        setEntryFilename(resolvedEntry)
        setCode(activeFileRecord?.content || loadedSandbox.code || getSandboxStarterCode('python', loadedClassroom?.name))
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
  }, [code, language, entryFilename, projectName, activeFile, readyToPersist, loading, workspaceFiles])

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

  useEffect(() => {
    const selectedFile =
      workspaceFiles.find((file) => file.path === activeFile) ||
      workspaceFiles.find((file) => file.path === entryFilename) ||
      workspaceFiles[0]

    if (!selectedFile) return
    if (selectedFile.path !== activeFile) {
      setActiveFile(selectedFile.path)
    }
    if (code !== selectedFile.content) {
      setCode(selectedFile.content)
    }
  }, [activeFile, entryFilename, workspaceFiles])

  function handleCodeChange(nextCode: string) {
    setCode(nextCode)
    setWorkspaceFiles((currentFiles) => {
      let changed = false
      const nextFiles = currentFiles.map((file) => {
        if (file.path !== activeFile || file.content === nextCode) return file
        changed = true
        return { ...file, content: nextCode }
      })
      return changed ? nextFiles : currentFiles
    })
  }

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
          stdin: '',
          entryFilename,
          projectName,
          activeFile,
          workspaceFiles,
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
    setRuntimeError(null)

    try {
      const browserResult = await liveRuntime.runProgram({
        code,
        entryFilename,
        files: workspaceFiles as BrowserPythonFile[],
      })
      if (!browserResult) return

      const savedSandbox = await persistSandbox(false, browserResult, 'Live run synced to Supabase.')
      setRunResult(browserResult)
      if (savedSandbox) {
        setSandbox(savedSandbox)
        setLastSavedAt(savedSandbox.updated_at || new Date().toISOString())
      }
    } catch (error: any) {
      setRuntimeError(error?.message || 'Failed to run sandbox')
    }
  }

  function loadStarterForLanguage() {
    const defaultFiles = getDefaultSandboxFiles('python', classroom?.name)
    setLanguage('python')
    setEntryFilename(getSandboxEntryFilename('python'))
    setWorkspaceFiles(defaultFiles)
    setActiveFile(defaultFiles[0]?.path || 'main.py')
    setCode(defaultFiles[0]?.content || getSandboxStarterCode('python', classroom?.name))
    setRunResult(null)
  }

  function handleSelectFile(path: string) {
    setActiveFile(path)
  }

  function handleCreateFile() {
    const existing = new Set(workspaceFiles.map((file) => file.path))
    let index = workspaceFiles.length + 1
    let nextPath = `module-${index}.py`

    while (existing.has(nextPath)) {
      index += 1
      nextPath = `module-${index}.py`
    }

    const nextFiles = [...workspaceFiles, { path: nextPath, content: '# New helper module\n' }]
    setWorkspaceFiles(nextFiles)
    setActiveFile(nextPath)
    setCode('# New helper module\n')
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
            <Button size="sm" onClick={handleRun} disabled={liveRuntime.running}>
              {liveRuntime.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
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
                execute in a live in-browser Python runtime with real prompts and streamed output.
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
                  <li>Each class gets its own saved workspace and run history.</li>
                  <li>Runs save the latest output, runtime, and status back to Supabase.</li>
                  <li>Python starter code and a live Python runtime keep each classroom experience consistent.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="site-panel overflow-hidden border-border/80 bg-[#11151c]/95 text-slate-100 shadow-[0_32px_120px_-60px_rgba(15,23,42,0.85)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#161b22] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                </div>
                <div>
                  <input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    className="w-full max-w-sm border-0 bg-transparent p-0 text-sm font-semibold text-slate-100 outline-none"
                    placeholder="Project name"
                  />
                  <p className="text-xs text-slate-400">{selectedLanguageMeta?.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  <span>Easy Mode</span>
                  <Switch checked={!easyMode} onCheckedChange={(checked) => setEasyMode(!checked)} />
                  <span>Advanced</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTerminalOpen((open) => !open)}
                  className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
                >
                  <TerminalSquare className="h-4 w-4" />
                  {terminalOpen ? 'Hide Terminal' : 'Show Terminal'}
                </Button>
                <Badge className="border-sky-400/20 bg-sky-400/10 text-sky-200">Python Only</Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-300">
                  {workspaceFiles.length} files
                </Badge>
              </div>
            </div>

            <ResizablePanelGroup direction="horizontal" className="min-h-[760px] bg-[#0d1117]">
              <ResizablePanel defaultSize={easyMode ? 22 : 18} minSize={14} maxSize={28}>
                <aside className="flex h-full flex-col border-r border-white/10 bg-[#11161d]">
                  <div className="border-b border-white/10 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Explorer</p>
                        <p className="mt-1 text-sm font-medium text-slate-100">Sandbox Project</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreateFile}
                        className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
                      >
                        <FilePlus2 className="h-4 w-4" />
                        Add
                      </Button>
                    </div>

                    {easyMode && (
                      <div className="mt-4 rounded-2xl border border-sky-400/15 bg-sky-400/8 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-sky-100">
                          <FolderKanban className="h-4 w-4" />
                          Easy Mode Guide
                        </div>
                        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                          <li>Open `main.py` to write the code that runs.</li>
                          <li>Add helper files when your project gets bigger.</li>
                          <li>Use the terminal panel to review output and errors.</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 overflow-auto px-3 py-4">
                    {workspaceFiles.map((file) => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => handleSelectFile(file.path)}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                          activeFile === file.path
                            ? 'border-sky-400/30 bg-sky-400/12 text-white'
                            : 'border-white/8 bg-white/[0.03] text-slate-300 hover:border-sky-400/20 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{file.path}</p>
                          {file.path === entryFilename && (
                            <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                              Run
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {file.path === entryFilename ? 'Entry file for program runs' : 'Helper module for imports'}
                        </p>
                      </button>
                    ))}
                  </div>
                </aside>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={78} minSize={50}>
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={terminalOpen ? 72 : 100} minSize={50}>
                    <div className="flex h-full flex-col bg-[#0d1117]">
                      <div className="flex items-center justify-between border-b border-white/10 bg-[#161b22] px-4 py-2.5 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <LayoutPanelLeft className="h-4 w-4" />
                          <span className="font-medium text-slate-200">{activeFile}</span>
                        </div>
                        <span>{activeFile === entryFilename ? 'Executed on Run' : 'Imported into main.py'}</span>
                      </div>

                      {easyMode && (
                        <div className="grid gap-3 border-b border-white/10 bg-[#11161d] px-4 py-3 text-xs text-slate-400 md:grid-cols-3">
                          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                            <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">Step 1</span>
                            Open a file and write Python.
                          </div>
                          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                            <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">Step 2</span>
                            Press Run to execute your project.
                          </div>
                          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                            <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">Step 3</span>
                            Read output in the terminal below.
                          </div>
                        </div>
                      )}

                      <div className="flex-1">
                        {editorLoadFailed ? (
                          <textarea
                            value={code}
                            onChange={(event) => handleCodeChange(event.target.value)}
                            spellCheck={false}
                            className="h-full min-h-[420px] w-full resize-none border-0 bg-[#0d1117] px-4 py-4 font-mono text-sm text-slate-100 outline-none"
                          />
                        ) : (
                          <MonacoEditor
                            height="100%"
                            language="python"
                            value={code}
                            onChange={(value) => handleCodeChange(value ?? '')}
                            onMount={() => setEditorLoadFailed(false)}
                            loading={
                              <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-slate-500">
                                Loading code editor...
                              </div>
                            }
                            theme={editorTheme === 'light' ? 'vs' : 'vs-dark'}
                            options={{
                              minimap: { enabled: !easyMode },
                              fontSize: easyMode ? 15 : 14,
                              automaticLayout: true,
                              wordWrap: easyMode ? 'on' : 'off',
                              smoothScrolling: true,
                              tabSize: 2,
                              padding: { top: 16 },
                              glyphMargin: !easyMode,
                              lineNumbersMinChars: easyMode ? 3 : 4,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </ResizablePanel>

                  {terminalOpen && (
                    <>
                      <ResizableHandle withHandle />
                      <ResizablePanel defaultSize={28} minSize={18}>
                        <div className="flex h-full flex-col bg-[#0b0f14]">
                          <div className="flex items-center justify-between border-b border-white/10 bg-[#11161d] px-4 py-2.5">
                            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                              <span className="text-slate-100">Terminal</span>
                              <span>Input</span>
                              <span>Output</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{runResult?.runtime || sandbox?.last_run_runtime || 'pending'}</span>
                              <span className="rounded-full border border-white/10 px-2 py-0.5 text-slate-300">
                                {runResult?.status || sandbox?.last_run_status || 'idle'}
                              </span>
                            </div>
                          </div>

                          <div className={`grid flex-1 ${easyMode ? 'lg:grid-cols-[0.95fr_1.05fr]' : 'lg:grid-cols-[0.75fr_1.25fr]'}`}>
                            <div className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
                              <h2 className="text-sm font-semibold text-slate-100">Interactive Input</h2>
                              <p className="mb-3 mt-2 text-xs leading-relaxed text-slate-500">
                                The sandbox no longer uses a separate stdin box. When your Python program calls
                                {' '}<span className="font-mono text-slate-300">input()</span>, you&apos;ll be prompted in real time and the full exchange will appear in the terminal transcript.
                              </p>
                              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
                                Use <span className="font-mono text-slate-100">Run</span> to start the program, then respond to prompts as they appear.
                              </div>
                            </div>

                            <div className="p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <Play className="h-4 w-4 text-sky-300" />
                                  <h2 className="text-sm font-semibold text-slate-100">Last Run</h2>
                                </div>
                                {runResult?.status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                              </div>

                              {runtimeError && (
                                <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                                  {runtimeError}
                                </div>
                              )}

                              {liveRuntime.runtimeError && (
                                <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                                  {liveRuntime.runtimeError}
                                </div>
                              )}

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Status</p>
                                  <p className="mt-2 text-sm font-semibold capitalize text-slate-100">
                                    {runResult?.status || liveRuntime.lastResult?.status || sandbox?.last_run_status || 'Not run yet'}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Runtime</p>
                                  <p className="mt-2 text-sm font-semibold text-slate-100">
                                    {runResult?.runtime || liveRuntime.lastResult?.runtime || sandbox?.last_run_runtime || 'Pending'}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 rounded-xl border border-white/10 bg-[#05080c] p-4 text-sm text-slate-100">
                                <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">Output</p>
                                <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap break-words font-mono text-[13px]">
                                  {liveRuntime.terminalOutput || runResult?.stdout || sandbox?.last_run_output || 'No stdout yet.'}
                                  {(runResult?.stderr || liveRuntime.lastResult?.stderr || sandbox?.last_run_error) &&
                                    `\n\n${runResult?.stderr || liveRuntime.lastResult?.stderr || sandbox?.last_run_error}`}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      </ResizablePanel>
                    </>
                  )}
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>

            {editorLoadFailed && (
              <div className="border-t border-white/10 bg-[#11161d] px-4 py-3 text-xs text-slate-500">
                Monaco is unavailable in this session, so a plain text editor is being used instead.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
