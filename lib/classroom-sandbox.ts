export type SandboxLanguage = 'python' | 'javascript'

export type StudentSandboxRecord = {
  id: string
  classroom_id: string
  student_id: string
  language: SandboxLanguage
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

export const SANDBOX_LANGUAGE_OPTIONS: Array<{ value: SandboxLanguage; label: string; description: string }> = [
  { value: 'python', label: 'Python', description: 'Fast scripting and beginner-friendly problem solving.' },
  { value: 'javascript', label: 'JavaScript', description: 'Browser-style scripting and full-stack logic practice.' },
]

export function normalizeSandboxLanguage(value: string | null | undefined): SandboxLanguage {
  return value === 'javascript' ? 'javascript' : 'python'
}

export function getSandboxEntryFilename(language: SandboxLanguage): string {
  return language === 'javascript' ? 'main.js' : 'main.py'
}

export function getSandboxStarterCode(language: SandboxLanguage, classroomName?: string | null): string {
  const label = classroomName ? JSON.stringify(classroomName) : '"your classroom"'

  if (language === 'javascript') {
    return [
      `const classroom = ${label};`,
      '',
      'function greet(name) {',
      '  return `Welcome to ${classroom}, ${name}!`;',
      '}',
      '',
      "console.log(greet('Coder'));",
    ].join('\n')
  }

  return [
    `classroom = ${label}`,
    '',
    'def greet(name: str) -> str:',
    '    return f"Welcome to {classroom}, {name}!"',
    '',
    "print(greet('Coder'))",
  ].join('\n')
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
