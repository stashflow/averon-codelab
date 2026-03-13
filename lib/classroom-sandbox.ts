export type SandboxLanguage = 'python'

export const SANDBOX_SETUP_MESSAGE =
  'Sandbox mode is not set up in Supabase yet. Apply scripts/049_student_sandbox_mode.sql to create public.student_sandboxes.'

export type StudentSandboxRecord = {
  id: string
  classroom_id: string
  student_id: string
  language: SandboxLanguage
  project_name: string | null
  active_file: string | null
  workspace_files: StudentSandboxFile[] | null
  entry_filename: string
  code: string
  stdin: string
  last_run_status: string | null
  last_run_output: string | null
  last_run_error: string | null
  last_run_runtime: string | null
  last_run_duration_ms: number | null
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export type StudentSandboxFile = {
  path: string
  content: string
}

export const SANDBOX_LANGUAGE_OPTIONS: Array<{ value: SandboxLanguage; label: string; description: string }> = [
  { value: 'python', label: 'Python', description: 'Fast scripting and beginner-friendly problem solving.' },
]

export function normalizeSandboxLanguage(value: string | null | undefined): SandboxLanguage {
  return 'python'
}

export function getSandboxEntryFilename(language: SandboxLanguage): string {
  return 'main.py'
}

export function getSandboxStarterCode(language: SandboxLanguage, classroomName?: string | null): string {
  const label = classroomName ? JSON.stringify(classroomName) : '"your classroom"'

  return [
    `classroom = ${label}`,
    '',
    'def greet(name: str) -> str:',
    '    return f"Welcome to {classroom}, {name}!"',
    '',
    "print(greet('Coder'))",
  ].join('\n')
}

export function getDefaultSandboxFiles(language: SandboxLanguage, classroomName?: string | null): StudentSandboxFile[] {
  return [
    {
      path: getSandboxEntryFilename(language),
      content: getSandboxStarterCode(language, classroomName),
    },
    {
      path: 'helpers.py',
      content: ['def banner(title: str) -> str:', '    return f"== {title} =="' ].join('\n'),
    },
  ]
}

export function normalizeSandboxFiles(
  files: Partial<StudentSandboxFile>[] | null | undefined,
  classroomName?: string | null,
): StudentSandboxFile[] {
  const fallback = getDefaultSandboxFiles('python', classroomName)
  if (!Array.isArray(files) || files.length === 0) return fallback

  const normalized = files
    .map((file) => ({
      path: String(file?.path || '').trim().replace(/^\/+/, ''),
      content: String(file?.content || ''),
    }))
    .filter((file) => file.path.endsWith('.py'))

  if (normalized.length === 0) return fallback
  if (!normalized.some((file) => file.path === 'main.py')) {
    normalized.unshift({
      path: 'main.py',
      content: getSandboxStarterCode('python', classroomName),
    })
  }

  return normalized
}

export function normalizeSandboxRecord(
  record: Partial<StudentSandboxRecord> | null | undefined,
  classroomId: string,
  studentId: string,
  classroomName?: string | null,
): Omit<StudentSandboxRecord, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<StudentSandboxRecord, 'id' | 'created_at' | 'updated_at'>> {
  const language = normalizeSandboxLanguage(record?.language)
  return {
    id: record?.id,
    classroom_id: classroomId,
    student_id: studentId,
    language,
    project_name: record?.project_name || 'Class Sandbox Project',
    active_file: record?.active_file || getSandboxEntryFilename(language),
    workspace_files: normalizeSandboxFiles(record?.workspace_files, classroomName),
    entry_filename: record?.entry_filename || getSandboxEntryFilename(language),
    code: record?.code || getSandboxStarterCode(language, classroomName),
    stdin: record?.stdin || '',
    last_run_status: record?.last_run_status || null,
    last_run_output: record?.last_run_output || null,
    last_run_error: record?.last_run_error || null,
    last_run_runtime: record?.last_run_runtime || null,
    last_run_duration_ms: typeof record?.last_run_duration_ms === 'number' ? record.last_run_duration_ms : null,
    last_run_at: record?.last_run_at || null,
    created_at: record?.created_at,
    updated_at: record?.updated_at,
  }
}

export function isMissingSandboxTableError(error: unknown): boolean {
  const typedError = error as { code?: string; message?: string } | null
  const message = String(typedError?.message || '').toLowerCase()

  return (
    typedError?.code === 'PGRST205' ||
    message.includes('public.student_sandboxes') ||
    message.includes('student_sandboxes') && message.includes('schema cache')
  )
}
