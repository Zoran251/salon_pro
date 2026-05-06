import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg,#090b0c,#15181a 55%,#050505)',
          color: '#f7d66a',
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(145deg,rgba(212,175,55,.22),rgba(212,175,55,.04))',
            border: '2px solid rgba(212,175,55,.55)',
            boxShadow: '0 20px 48px rgba(0,0,0,.45)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 20, marginBottom: -3 }}>
              <div style={{ width: 7, height: 13, background: '#f7d66a', borderRadius: 2 }} />
              <div style={{ width: 7, height: 20, background: '#fff0a6', borderRadius: 2 }} />
              <div style={{ width: 7, height: 13, background: '#f7d66a', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -5 }}>SP</div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
