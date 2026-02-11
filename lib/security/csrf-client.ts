'use client'

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/security/csrf'

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null

  const cookie = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${CSRF_COOKIE_NAME}=`))

  if (!cookie) return null
  return decodeURIComponent(cookie.substring(CSRF_COOKIE_NAME.length + 1))
}

export function withCsrfHeaders(existing?: HeadersInit): Headers {
  const headers = new Headers(existing)
  const token = getCsrfToken()

  if (token) {
    headers.set(CSRF_HEADER_NAME, token)
  }

  return headers
}
