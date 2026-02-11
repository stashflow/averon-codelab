import { NextResponse } from 'next/server'

export const CSRF_COOKIE_NAME = 'acl_csrf_token'
export const CSRF_HEADER_NAME = 'x-csrf-token'

const CSRF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {}
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=')
    if (!rawKey) return acc
    const value = rest.join('=')
    acc[rawKey] = decodeURIComponent(value || '')
    return acc
  }, {})
}

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: CSRF_COOKIE_MAX_AGE_SECONDS,
  }
}

export function ensureValidCsrf(request: Request): NextResponse | null {
  const expectedOrigin = new URL(request.url).origin
  const origin = request.headers.get('origin')

  if (origin && origin !== expectedOrigin) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  const cookies = parseCookieHeader(request.headers.get('cookie'))
  const cookieToken = cookies[CSRF_COOKIE_NAME]
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken || !safeCompare(cookieToken, headerToken)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  return null
}
