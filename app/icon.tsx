import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const size = {
  width: 192,
  height: 192,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 100,
          background: 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 48,
          position: 'relative',
          boxShadow: '0 20px 60px rgba(6, 182, 212, 0.3)',
        }}
      >
        {/* Inner circle */}
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

        {/* Decorative corner element */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            width: 30,
            height: 30,
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
