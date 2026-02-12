import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

export async function GET() {
  const size = 192
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 100,
          background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 48,
          position: 'relative',
          boxShadow: '0 20px 60px rgba(249, 115, 22, 0.30)',
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 'bold',
            color: 'white',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-4px',
          }}
        >
          AC
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}
