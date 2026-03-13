'use client'

import nextDynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  ArrowLeft,
  FileCode2,
  FilePlus2,
  LayoutPanelLeft,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react'

import { LiveRuntimePanel } from '@/components/code/live-runtime-panel'
import { SiteBackdrop } from '@/components/site-backdrop'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
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

        setProjectName(activeFileRecord?.path || loadedSandbox.project_name || 'main.py')
        setWorkspaceFiles(normalizedFiles)
        setActiveFile(activeFileRecord?.path || resolvedActiveFile)
        setEntryFilename(activeFileRecord?.path || resolvedEntry)
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
    setProjectName(defaultFiles[0]?.path || 'main.py')
    setCode(defaultFiles[0]?.content || getSandboxStarterCode('python', classroom?.name))
    setRunResult(null)
    liveRuntime.clearTerminal()
  }

  function handleSelectFile(path: string) {
    setActiveFile(path)
    setEntryFilename(path)
    setProjectName(path)
  }

  function handleCreateFile() {
    const rawName = window.prompt('New project file name', `project-${workspaceFiles.length + 1}.py`)
    if (!rawName) return

    const trimmed = rawName.trim()
    const normalized = trimmed.endsWith('.py') ? trimmed : `${trimmed}.py`
    if (!normalized || workspaceFiles.some((file) => file.path === normalized)) {
      setRuntimeError('Choose a unique Python file name.')
      return
    }

    const starter = 'print("Hello from your new project")\n'
    const nextFiles = [...workspaceFiles, { path: normalized, content: starter }]
    setWorkspaceFiles(nextFiles)
    setActiveFile(normalized)
    setEntryFilename(normalized)
    setProjectName(normalized)
    setCode(starter)
    setRunResult(null)
    liveRuntime.clearTerminal()
  }

  function handleDeleteFile(path: string) {
    if (workspaceFiles.length <= 1) {
      setRuntimeError('Keep at least one Python file in the sandbox.')
      return
    }
    if (!window.confirm(`Delete ${path}?`)) return

    const nextFiles = workspaceFiles.filter((file) => file.path !== path)
    const fallback = nextFiles[0]
    setWorkspaceFiles(nextFiles)
    if (activeFile === path || entryFilename === path) {
      setActiveFile(fallback.path)
      setEntryFilename(fallback.path)
      setProjectName(fallback.path)
      setCode(fallback.content)
    }
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
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
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

      <main className="relative z-10 h-[calc(100vh-4rem)] px-4 py-4 sm:px-6 lg:px-8">
        <div className="h-full overflow-hidden rounded-[28px] border border-border/80 bg-[#11151c]/95 text-slate-100 shadow-[0_32px_120px_-60px_rgba(15,23,42,0.85)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#161b22] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{projectName || activeFile}</p>
                  <p className="text-xs text-slate-400">{classroom?.name || 'Class Sandbox'} • {saveLabel}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge className="border-sky-400/20 bg-sky-400/10 text-sky-200">Python Only</Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-300">
                  {workspaceFiles.length} project{workspaceFiles.length === 1 ? '' : 's'}
                </Badge>
              </div>
            </div>

            <ResizablePanelGroup direction="horizontal" className="h-[calc(100%-61px)] bg-[#0d1117]">
              <ResizablePanel defaultSize={20} minSize={14} maxSize={28}>
                <aside className="flex h-full flex-col border-r border-white/10 bg-[#11161d]">
                  <div className="border-b border-white/10 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Projects</p>
                        <p className="mt-1 text-sm font-medium text-slate-100">Python Files</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreateFile}
                        className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
                      >
                        <FilePlus2 className="h-4 w-4" />
                        New
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 overflow-auto px-3 py-4">
                    {workspaceFiles.map((file) => (
                      <div
                        key={file.path}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                          activeFile === file.path
                            ? 'border-sky-400/30 bg-sky-400/12 text-white'
                            : 'border-white/8 bg-white/[0.03] text-slate-300 hover:border-sky-400/20 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleSelectFile(file.path)} className="flex flex-1 items-center gap-3 text-left">
                            <FileCode2 className="h-4 w-4" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{file.path}</p>
                              <p className="mt-1 text-xs text-slate-500">Open and run this project</p>
                            </div>
                          </button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white"
                            onClick={() => handleDeleteFile(file.path)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={78} minSize={50}>
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={68} minSize={45}>
                    <div className="flex h-full flex-col bg-[#0d1117]">
                      <div className="flex items-center justify-between border-b border-white/10 bg-[#161b22] px-4 py-2.5 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <LayoutPanelLeft className="h-4 w-4" />
                          <span className="font-medium text-slate-200">{activeFile}</span>
                        </div>
                        <span>{selectedLanguageMeta?.description}</span>
                      </div>

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
                              minimap: { enabled: true },
                              fontSize: 15,
                              automaticLayout: true,
                              wordWrap: 'on',
                              smoothScrolling: true,
                              tabSize: 2,
                              padding: { top: 16 },
                              glyphMargin: false,
                              lineNumbersMinChars: 4,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </ResizablePanel>

                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={32} minSize={20}>
                    <div className="h-full bg-[#0b0f14] p-3">
                      <LiveRuntimePanel
                        output={liveRuntime.terminalOutput || runResult?.stdout || sandbox?.last_run_output || ''}
                        error={liveRuntime.runtimeError || runtimeError || runResult?.stderr || sandbox?.last_run_error || null}
                        runtime={runResult?.runtime || liveRuntime.lastResult?.runtime || sandbox?.last_run_runtime || 'browser-python-live'}
                        status={runResult?.status || liveRuntime.lastResult?.status || sandbox?.last_run_status || 'idle'}
                        running={liveRuntime.running}
                        title="Terminal"
                        subtitle="Input and output stay together here."
                        onClear={liveRuntime.clearTerminal}
                        pendingPrompt={liveRuntime.pendingInputPrompt}
                        pendingValue={liveRuntime.pendingInputValue}
                        waitingForInput={liveRuntime.waitingForInput}
                        onPendingValueChange={liveRuntime.setPendingInputValue}
                        onSubmitInput={liveRuntime.submitInput}
                        onCancelInput={liveRuntime.cancelInput}
                        className="h-full"
                      />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>

            {editorLoadFailed && (
              <div className="border-t border-white/10 bg-[#11161d] px-4 py-3 text-xs text-slate-500">
                Monaco is unavailable in this session, so a plain text editor is being used instead.
              </div>
            )}
        </div>
      </main>
    </div>
  )
}
