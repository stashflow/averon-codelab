import { NextResponse } from 'next/server'

import {
  SANDBOX_SETUP_MESSAGE,
  isMissingSandboxTableError,
  normalizeSandboxLanguage,
  normalizeSandboxRecord,
} from '@/lib/classroom-sandbox'
import { ensureValidCsrf } from '@/lib/security/csrf'
import { canUserAccessClassroom } from '@/lib/security/role-scope'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

async function requireStudentSandboxAccess(classroomId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'student') {
    return { error: NextResponse.json({ error: 'Only students can access classroom sandbox mode' }, { status: 403 }) }
  }

  const authorized = await canUserAccessClassroom(supabase, user.id, classroomId)
  if (!authorized) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const { data: classroom } = await supabase.from('classrooms').select('id, name, code').eq('id', classroomId).maybeSingle()
  if (!classroom) {
    return { error: NextResponse.json({ error: 'Classroom not found' }, { status: 404 }) }
  }

  return { supabase, user, classroom }
}

async function getOrCreateSandbox(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classroomId: string,
  userId: string,
  classroomName?: string | null,
) {
  const { data: existing, error: fetchError } = await supabase
    .from('student_sandboxes')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('student_id', userId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (existing) return existing

  const seed = normalizeSandboxRecord(null, classroomId, userId, classroomName)
  const { data: created, error: insertError } = await supabase
    .from('student_sandboxes')
    .insert({
      classroom_id: classroomId,
      student_id: userId,
      language: seed.language,
      entry_filename: seed.entry_filename,
      code: seed.code,
      stdin: seed.stdin,
    })
    .select('*')
    .single()

  if (insertError) throw insertError
  return created
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: classroomId } = await context.params
    const access = await requireStudentSandboxAccess(classroomId)
    if (access.error) return access.error

    const sandbox = await getOrCreateSandbox(access.supabase, classroomId, access.user.id, access.classroom?.name)

    return NextResponse.json({
      classroom: access.classroom,
      sandbox,
    })
  } catch (error: any) {
    if (isMissingSandboxTableError(error)) {
      return NextResponse.json({ error: SANDBOX_SETUP_MESSAGE }, { status: 503 })
    }

    return NextResponse.json({ error: error?.message || 'Failed to load sandbox mode' }, { status: 500 })
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const csrfError = ensureValidCsrf(request)
    if (csrfError) return csrfError

    const { id: classroomId } = await context.params
    const access = await requireStudentSandboxAccess(classroomId)
    if (access.error) return access.error

    const body = await request.json()
    const defaults = normalizeSandboxRecord(null, classroomId, access.user.id, access.classroom?.name)
    const language = normalizeSandboxLanguage('python')
    const hasCode = Object.prototype.hasOwnProperty.call(body, 'code')
    const code = hasCode ? String(body.code ?? '') : defaults.code
    const stdin = Object.prototype.hasOwnProperty.call(body, 'stdin') ? String(body.stdin ?? '') : ''
    const entryFilename = String(body.entryFilename || '').trim()

    const { data: sandbox, error } = await access.supabase
      .from('student_sandboxes')
      .upsert(
        {
          classroom_id: classroomId,
          student_id: access.user.id,
          language,
          entry_filename: entryFilename || defaults.entry_filename,
          code,
          stdin,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'classroom_id,student_id' },
      )
      .select('*')
      .single()

    if (error) {
      if (isMissingSandboxTableError(error)) {
        return NextResponse.json({ error: SANDBOX_SETUP_MESSAGE }, { status: 503 })
      }

      return NextResponse.json({ error: error.message || 'Failed to save sandbox' }, { status: 500 })
    }

    return NextResponse.json({ sandbox })
  } catch (error: any) {
    if (isMissingSandboxTableError(error)) {
      return NextResponse.json({ error: SANDBOX_SETUP_MESSAGE }, { status: 503 })
    }

    return NextResponse.json({ error: error?.message || 'Failed to save sandbox mode' }, { status: 500 })
  }
}
