import { ImageResponse } from 'next/og'

export const alt = 'Salon Pro - SaaS for Beauty Professionals'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at center, #202328 0%, #0a0c0e 58%, #050607 100%)',
          color: '#f6d778',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(255,255,255,.08) 0%, transparent 28%, rgba(0,0,0,.45) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 900,
            height: 900,
            borderRadius: 450,
            background: 'radial-gradient(circle, rgba(212,175,55,.16) 0%, transparent 64%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 22,
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 170,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: -18,
              color: '#f7d879',
              textShadow: '0 8px 0 #8a6818, 0 26px 48px rgba(0,0,0,.65)',
            }}
          >
            SP
            <div
              style={{
                position: 'absolute',
                top: -50,
                right: 22,
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
              }}
            >
              {[48, 78, 48].map((height, index) => (
                <div
                  key={index}
                  style={{
                    width: 24,
                    height,
                    borderRadius: '14px 14px 4px 4px',
                    background: 'linear-gradient(180deg,#fff1a6,#d4af37 55%,#8a6818)',
                  }}
                />
              ))}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 22,
              letterSpacing: 12,
              textShadow: '0 6px 0 rgba(90,64,12,.9), 0 18px 36px rgba(0,0,0,.7)',
            }}
          >
            <span style={{ fontSize: 78, fontWeight: 400 }}>SALON</span>
            <span style={{ fontSize: 82, fontWeight: 800 }}>PRO</span>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 34,
              letterSpacing: 1,
              color: '#e2bd5b',
              textShadow: '0 10px 28px rgba(0,0,0,.65)',
            }}
          >
            SaaS for Beauty Professionals
          </div>
        </div>
      </div>
    ),
    size,
  )
}
