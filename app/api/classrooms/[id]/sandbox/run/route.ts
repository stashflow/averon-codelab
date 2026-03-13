import { NextResponse } from 'next/server'

import { normalizeSandboxLanguage, normalizeSandboxRecord } from '@/lib/classroom-sandbox'
import { ensureValidCsrf } from '@/lib/security/csrf'
import { canUserAccessClassroom } from '@/lib/security/role-scope'
import { runSandboxExecution } from '@/lib/sandbox-runtime'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const csrfError = ensureValidCsrf(request)
    if (csrfError) return csrfError

    const { id: classroomId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'student') {
      return NextResponse.json({ error: 'Only students can run classroom sandboxes' }, { status: 403 })
    }

    const authorized = await canUserAccessClassroom(supabase, user.id, classroomId)
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: classroom } = await supabase.from('classrooms').select('id, name').eq('id', classroomId).maybeSingle()
    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
    }

    const body = await request.json()
    const language = normalizeSandboxLanguage(String(body.language || 'python'))
    const code = String(body.code || '')
    const stdin = String(body.stdin || '')
    const defaults = normalizeSandboxRecord(null, classroomId, user.id, classroom.name)
    const entryFilename = String(body.entryFilename || '').trim() || defaults.entry_filename

    if (!code.trim()) {
      return NextResponse.json({ error: 'Code is required to run the sandbox.' }, { status: 400 })
    }

    const result = await runSandboxExecution({
      language,
      code,
      stdin,
    })

    const { data: sandbox, error: saveError } = await supabase
      .from('student_sandboxes')
      .upsert(
        {
          classroom_id: classroomId,
          student_id: user.id,
          language,
          entry_filename: entryFilename,
          code,
          stdin,
          last_run_status: result.status,
          last_run_output: result.stdout,
          last_run_error: result.stderr,
          last_run_runtime: result.runtime,
          last_run_duration_ms: result.durationMs,
          last_run_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'classroom_id,student_id' },
      )
      .select('*')
      .single()

    if (saveError) {
      return NextResponse.json({ error: saveError.message || 'Failed to persist sandbox run' }, { status: 500 })
    }

    return NextResponse.json({
      result,
      sandbox,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to run classroom sandbox' }, { status: 500 })
  }
}
