export type CurriculumCheckpointRow = {
  id: string
  title: string | null
  checkpoint_type: string | null
  starter_code: string | null
  required_function_name: string | null
  required_signature: string | null
}

export type CurriculumValidationIssue = {
  checkpointId: string
  title: string
  severity: 'warning' | 'error'
  message: string
}

function normalizeType(raw: string | null): string {
  return String(raw || '').trim().toLowerCase()
}

export function validateCheckpointRow(row: CurriculumCheckpointRow): CurriculumValidationIssue[] {
  const issues: CurriculumValidationIssue[] = []
  const title = String(row.title || 'Untitled checkpoint')
  const starter = String(row.starter_code || '').toLowerCase()
  const type = normalizeType(row.checkpoint_type)

  if (type === 'hello_world') {
    if (!/hello,?\s*world/.test(starter)) {
      issues.push({
        checkpointId: row.id,
        title,
        severity: 'error',
        message: 'Checkpoint type is hello_world but starter code does not output Hello, World.',
      })
    }
    if (/def\s+[a-z_][a-z0-9_]*\s*\(/.test(starter) && !/print\(/.test(starter)) {
      issues.push({
        checkpointId: row.id,
        title,
        severity: 'warning',
        message: 'Hello World checkpoint appears to include function-style starter code.',
      })
    }
  }

  if (type === 'function' && !row.required_function_name && !row.required_signature) {
    issues.push({
      checkpointId: row.id,
      title,
      severity: 'warning',
      message: 'Function checkpoint has no required function metadata for autograder transparency.',
    })
  }

  if (row.required_function_name && row.required_signature) {
    const fn = row.required_function_name.trim()
    const sig = row.required_signature.trim()
    if (fn && sig && !sig.startsWith(`${fn}(`)) {
      issues.push({
        checkpointId: row.id,
        title,
        severity: 'warning',
        message: 'required_function_name and required_signature appear inconsistent.',
      })
    }
  }

  return issues
}
