import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Uslovi korištenja | Salon Pro',
  description: 'Uslovi korištenja aplikacije Salon Pro za upravljanje frizerskim i kozmetičkim salonima.',
}

export default async function TermsPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/legal/terms`, {
    next: { revalidate: 3600 },
  })
  const { data } = await res.json()

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', color: '#f5f0e8', fontFamily: 'sans-serif' }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        a:hover{color:#d4af37}
      `}</style>

      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 48px', borderBottom: '0.5px solid rgba(212,175,55,.2)', background: 'rgba(10,10,10,.97)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontSize: '22px', fontWeight: 500, background: 'linear-gradient(90deg,#d4af37,#f5e17a,#d4af37)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s linear infinite', textDecoration: 'none' }}>SalonPro</Link>
        <Link href="/" style={{ fontSize: '14px', color: 'rgba(245,240,232,.5)', textDecoration: 'none' }}>← Nazad na početnu</Link>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px 100px' }}>
        <h1 style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, fontFamily: 'Georgia,serif', color: '#f5f0e8', marginBottom: '8px' }}>
          {data?.title || 'Uslovi korištenja'}
        </h1>
        <p style={{ color: 'rgba(245,240,232,0.4)', marginBottom: '40px', fontSize: '15px' }}>
          Zadnje ažuriranje: {data?.updated_at ? new Date(data.updated_at).toLocaleDateString('sr-RS') : '—'}
        </p>

        <div style={{ background: '#111', border: '0.5px solid rgba(212,175,55,.15)', borderRadius: '20px', padding: '48px', lineHeight: 1.8, color: 'rgba(245,240,232,0.85)' }}>
          <div dangerouslySetInnerHTML={{ __html: data?.content_html || '<p>Sadržaj će biti dodat...</p>' }} />
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <Link href="/" style={{ color: '#d4af37', textDecoration: 'none', fontWeight: 600 }}>
            ← Vrati se na početnu stranicu
          </Link>
        </div>
      </div>

      <footer style={{ borderTop: '0.5px solid rgba(212,175,55,.1)', padding: '24px', textAlign: 'center', color: 'rgba(245,240,232,.25)', fontSize: '12px' }}>
        © {new Date().getFullYear()} SalonPro. Sva prava zadržana.
      </footer>
    </main>
  )
}