'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function InviteTokenPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function redeem() {
      setStatus('loading')
      setError(null)

      const response = await fetch('/api/magic-links/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token }),
      })

      const payload = await response.json()

      if (!response.ok) {
        setStatus('error')
        setError(payload?.error || 'Unable to redeem invite')
        return
      }

      setStatus('done')
      setTimeout(() => router.push('/protected'), 1000)
    }

    if (params?.token) {
      redeem()
    }
  }, [params, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-lg border p-6 bg-card space-y-4">
        <h1 className="text-xl font-semibold">Invitation</h1>
        {status === 'loading' && <p>Redeeming invitation...</p>}
        {status === 'done' && <p>Invitation accepted. Redirecting...</p>}
        {status === 'error' && (
          <>
            <p className="text-red-600">{error}</p>
            <Button onClick={() => router.push('/onboarding/teacher')}>Go to onboarding</Button>
          </>
        )}
      </div>
    </div>
  )
}
