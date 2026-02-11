import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureValidCsrf } from '@/lib/security/csrf'
import { inferLanguage, normalizeTestCases, runSandboxJudge } from '@/lib/judge/service'

export async function POST(request: Request) {
  try {
    const csrfError = ensureValidCsrf(request)
    if (csrfError) return csrfError

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const checkpointId = String(body.checkpointId || '').trim()
    const code = String(body.code || '')
    const starterCode = String(body.starterCode || '')
    const requestedLanguage = body.language ? String(body.language) : null

    if (!checkpointId || !code.trim()) {
      return NextResponse.json({ error: 'checkpointId and code are required' }, { status: 400 })
    }

    const { data: checkpoint, error: checkpointError } = await supabase
      .from('checkpoints')
      .select('id, test_cases, starter_code')
      .eq('id', checkpointId)
      .single()

    if (checkpointError || !checkpoint) {
      return NextResponse.json({ error: 'Checkpoint not found' }, { status: 404 })
    }

    const tests = normalizeTestCases(checkpoint.test_cases)
    if (tests.length === 0) {
      return NextResponse.json({ error: 'No test cases configured for this checkpoint' }, { status: 400 })
    }

    const judge = await runSandboxJudge({
      language: inferLanguage({
        language: requestedLanguage,
        code,
        starterCode: starterCode || checkpoint.starter_code,
      }),
      code,
      tests,
      context: { source: 'checkpoint', sourceId: checkpointId, userId: user.id },
    })

    const visibleResults = judge.results.filter((result) => {
      const source = tests.find((test) => test.id === result.id)
      return !source?.hidden
    })

    const resultsForUi = visibleResults.length > 0 ? visibleResults : judge.results
    const passedCount = resultsForUi.filter((test) => test.passed).length
    const totalCount = resultsForUi.length
    const passed = totalCount > 0 && passedCount === totalCount
    const score = totalCount > 0 ? (passedCount / totalCount) * 100 : 0

    return NextResponse.json({
      passed,
      score,
      results: resultsForUi,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to run tests' }, { status: 500 })
  }
}
