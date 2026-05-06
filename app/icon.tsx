import { ImageResponse } from 'next/og'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(145deg,#050606 0%,#121719 55%,#050606 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 96,
        }}
      >
        <div
          style={{
            width: 370,
            height: 370,
            borderRadius: 92,
            background: 'linear-gradient(135deg,#d4af37,#fff1a6 45%,#9c7416)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 34px 90px rgba(0,0,0,.55)',
          }}
        >
          <div
            style={{
              color: '#090909',
              fontSize: 156,
              fontWeight: 800,
              letterSpacing: -16,
              lineHeight: 1,
              display: 'flex',
            }}
          >
            SP
          </div>
        </div>
      </div>
    ),
    size,
  )
}
