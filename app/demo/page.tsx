import Link from 'next/link'

const gold = '#d4af37'
const text = '#f5f0e8'
const muted = 'rgba(245,240,232,.55)'
const border = 'rgba(212,175,55,.22)'
const card = {
  background: '#111',
  border: `0.5px solid ${border}`,
  borderRadius: '18px',
  padding: '22px',
} as const

const navItems = ['Pregled', 'Profil', 'Usluge', 'Lager', 'Termini', 'Moja stranica', 'Lojalnost']

const stats = [
  { label: 'Termini danas', value: '8', icon: '📅' },
  { label: 'Usluge', value: '14', icon: '💈' },
  { label: 'Artikala u lageru', value: '37', icon: '📦' },
  { label: 'Klijenti', value: '126', icon: '👥' },
]

const appointments = [
  { time: '09:30', client: 'Ana Marković', service: 'Feniranje', status: 'potvrđen' },
  { time: '11:00', client: 'Mina Petrović', service: 'Bojenje izrastka', status: 'ceka' },
  { time: '13:15', client: 'Jovana Ilić', service: 'Manikir gel', status: 'potvrđen' },
]

const services = [
  { name: 'Bojenje izrastka', price: '4.200 RSD', stock: 'Troši: Farba 35 ml · Hidrogen 20 ml' },
  { name: 'Feniranje', price: '1.600 RSD', stock: 'Troši: Šampon 12 ml · Maska 8 ml' },
  { name: 'Manikir gel', price: '2.800 RSD', stock: 'Troši: Gel baza 1 kom · Ulje 2 ml' },
]

const inventory = [
  { name: 'Farba #6.1', amount: '8 kom', min: 'min. 4' },
  { name: 'Hidrogen 6%', amount: '1.2 L', min: 'min. 1 L' },
  { name: 'Šampon keratin', amount: '420 ml', min: 'min. 300 ml' },
]

function DisabledButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      disabled
      style={{
        border: 'none',
        background: `linear-gradient(135deg,${gold},#b8960c)`,
        color: '#0a0a0a',
        padding: '10px 14px',
        borderRadius: '12px',
        fontWeight: 700,
        opacity: 0.55,
        cursor: 'not-allowed',
      }}
    >
      {children}
    </button>
  )
}

export default function DemoDashboard() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: text, fontFamily: 'sans-serif' }}>
      <style>{`
        @media(max-width: 900px) {
          .demo-shell { grid-template-columns: 1fr !important; }
          .demo-sidebar { position: static !important; min-height: auto !important; }
          .demo-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        style={{
          padding: '14px 24px',
          borderBottom: `0.5px solid ${border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap',
          background: 'rgba(10,10,10,.96)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <Link href="/" style={{ color: gold, textDecoration: 'none', fontSize: '22px', fontWeight: 700 }}>
          SalonPro
        </Link>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: muted }}>
            Demo režim: prikaz je zaključan i ne menja podatke.
          </span>
          <Link
            href="/registracija"
            style={{
              background: `linear-gradient(135deg,${gold},#b8960c)`,
              color: '#0a0a0a',
              padding: '10px 18px',
              borderRadius: '999px',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Kreiraj svoj salon
          </Link>
        </div>
      </div>

      <div className="demo-shell" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: 'calc(100vh - 67px)' }}>
        <aside
          className="demo-sidebar"
          style={{
            borderRight: `0.5px solid ${border}`,
            padding: '24px',
            background: '#0d0d0d',
            position: 'sticky',
            top: 67,
            minHeight: 'calc(100vh - 67px)',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <div style={{ color: gold, fontSize: '18px', fontWeight: 700 }}>Salon Elegance</div>
            <div style={{ color: muted, fontSize: '12px', marginTop: '4px' }}>Demo dashboard</div>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {navItems.map((item, index) => (
              <div
                key={item}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  color: index === 0 ? '#0a0a0a' : 'rgba(245,240,232,.78)',
                  background: index === 0 ? `linear-gradient(135deg,${gold},#b8960c)` : 'rgba(255,255,255,.035)',
                  fontSize: '14px',
                  fontWeight: index === 0 ? 700 : 500,
                }}
              >
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <section style={{ padding: '32px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <div>
              <div style={{ color: gold, fontSize: '12px', letterSpacing: '.08em', marginBottom: '8px' }}>ZAKLJUČAN DEMO</div>
              <h1 style={{ margin: 0, fontSize: '34px', fontWeight: 700 }}>Kako izgleda Salon Pro iznutra</h1>
              <p style={{ color: muted, maxWidth: '680px', lineHeight: 1.7 }}>
                Ovo je slikovit prikaz dashboarda: termini, usluge, lager, QR stranica i lojalnost. Dugmad su namerno zaključana da demo ne bi menjao stvarne podatke.
              </p>
            </div>
            <DisabledButton>Sačuvaj izmene</DisabledButton>
          </div>

          <div className="demo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px', marginBottom: '14px' }}>
            {stats.map((s) => (
              <div key={s.label} style={card}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>{s.icon}</div>
                <div style={{ fontSize: '28px', color: gold, fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: muted, fontSize: '13px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="demo-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr .9fr', gap: '14px', marginBottom: '14px' }}>
            <div style={card}>
              <h2 style={{ marginTop: 0, fontSize: '18px' }}>Današnji termini</h2>
              {appointments.map((a) => (
                <div key={`${a.time}-${a.client}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '13px 0', borderTop: '0.5px solid rgba(255,255,255,.06)' }}>
                  <div>
                    <div style={{ color: text, fontWeight: 700 }}>{a.time} · {a.client}</div>
                    <div style={{ color: muted, fontSize: '13px', marginTop: '4px' }}>{a.service}</div>
                  </div>
                  <span style={{ color: a.status === 'potvrđen' ? '#7ddf9a' : gold, fontSize: '12px' }}>{a.status}</span>
                </div>
              ))}
              <div style={{ marginTop: '14px' }}><DisabledButton>Potvrdi termin</DisabledButton></div>
            </div>

            <div style={card}>
              <h2 style={{ marginTop: 0, fontSize: '18px' }}>Moja stranica</h2>
              <div style={{ background: 'rgba(212,175,55,.1)', border: `0.5px solid ${border}`, borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
                <div style={{ color: muted, fontSize: '12px', marginBottom: '6px' }}>JAVNI LINK</div>
                <div style={{ color: gold, wordBreak: 'break-all' }}>salonpro.com/salon/elegance</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', width: '118px', height: '118px', background: gold, padding: '8px', borderRadius: '12px' }}>
                {Array.from({ length: 25 }).map((_, i) => (
                  <span key={i} style={{ background: i % 3 === 0 || i % 4 === 0 ? '#0a0a0a' : 'transparent', borderRadius: '2px' }} />
                ))}
              </div>
            </div>
          </div>

          <div className="demo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={card}>
              <h2 style={{ marginTop: 0, fontSize: '18px' }}>Usluge i potrošnja lagera</h2>
              {services.map((s) => (
                <div key={s.name} style={{ padding: '13px 0', borderTop: '0.5px solid rgba(255,255,255,.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <strong>{s.name}</strong>
                    <span style={{ color: gold }}>{s.price}</span>
                  </div>
                  <div style={{ color: muted, fontSize: '12px', marginTop: '5px' }}>{s.stock}</div>
                </div>
              ))}
              <div style={{ marginTop: '14px' }}><DisabledButton>Dodaj novu uslugu</DisabledButton></div>
            </div>

            <div style={card}>
              <h2 style={{ marginTop: 0, fontSize: '18px' }}>Lager</h2>
              {inventory.map((item) => (
                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 0', borderTop: '0.5px solid rgba(255,255,255,.06)' }}>
                  <div>
                    <strong>{item.name}</strong>
                    <div style={{ color: muted, fontSize: '12px', marginTop: '4px' }}>{item.min}</div>
                  </div>
                  <span style={{ color: gold, fontWeight: 700 }}>{item.amount}</span>
                </div>
              ))}
              <div style={{ marginTop: '14px' }}><DisabledButton>Dodaj artikal</DisabledButton></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
