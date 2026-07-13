'use client'

import { useState } from 'react'
import Link from 'next/link'

const gold = '#d4af37'
const text = '#f5f0e8'
const muted = 'rgba(245,240,232,.55)'
const goldBorder = 'rgba(212,175,55,.22)'

const navItems = [
  { id: 'pregled', icon: '🏠', label: 'Pregled' },
  { id: 'analitika', icon: '📊', label: 'Analitika' },
  { id: 'nalog', icon: '👤', label: 'Nalog' },
  { id: 'usluge', icon: '💈', label: 'Usluge' },
  { id: 'zaposleni', icon: '✂️', label: 'Zaposleni' },
  { id: 'lager', icon: '📦', label: 'Lager' },
  { id: 'termini', icon: '📅', label: 'Termini' },
  { id: 'recenzije', icon: '⭐', label: 'Recenzije' },
  { id: 'stranica', icon: '🔗', label: 'Moja stranica' },
  { id: 'lojalnost', icon: '🎁', label: 'Lojalnost' },
]

const cardStyle: React.CSSProperties = {
  background: '#161616', border: `0.5px solid ${goldBorder}`, borderRadius: '16px', padding: '24px'
}

const btnGold: React.CSSProperties = {
  background: `linear-gradient(135deg,${gold},#b8960c)`, color: '#0a0a0a',
  border: 'none', padding: '10px 20px', borderRadius: '10px',
  fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif'
}

const btnOutline: React.CSSProperties = {
  background: 'transparent', color: muted, border: `0.5px solid ${goldBorder}`,
  padding: '10px 20px', borderRadius: '10px', fontSize: '13px',
  cursor: 'pointer', fontFamily: 'sans-serif'
}

function DemoBanner() {
  return (
    <div style={{ background: 'rgba(212,175,55,.08)', border: `0.5px solid ${goldBorder}`, borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: gold, textAlign: 'center' }}>
      🔒 Demo režim — podaci se ne čuvaju. <Link href="/registracija" style={{ color: gold, fontWeight: 600 }}>Kreiraj svoj salon besplatno →</Link>
    </div>
  )
}

function DemoToast({ msg, show }: { msg: string; show: boolean }) {
  if (!show) return null
  return (
    <div className="demo-toast" style={{ position: 'fixed', bottom: 24, right: 24, background: '#1a1a1a', border: `0.5px solid ${goldBorder}`, borderRadius: 12, padding: '12px 20px', fontSize: 13, color: gold, zIndex: 9999, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
      🔒 {msg}
    </div>
  )
}

function InputField({ label, value, onChange, placeholder, type }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(0,0,0,.3)', border: `0.5px solid ${goldBorder}`, borderRadius: '8px',
    padding: '10px 12px', color: text, fontSize: '13px', outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box'
  }
  return (
    <div style={{ marginBottom: '14px' }}>
      {label && <label style={{ fontSize: '11px', color: muted, marginBottom: '6px', display: 'block', letterSpacing: '.08em' }}>{label}</label>}
      <input type={type || 'text'} style={inputStyle} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} disabled />
    </div>
  )
}

export default function DemoDashboard() {
  const [aktivan, setAktivan] = useState('pregled')
  const [toast, setToast] = useState('')
  const [toastShow, setToastShow] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setToastShow(true)
    setTimeout(() => setToastShow(false), 2500)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: text, fontFamily: 'sans-serif' }}>
      <style>{`
        @media(max-width: 900px) {
          .demo-shell { grid-template-columns: 1fr !important; min-height: auto !important; }
          .demo-sidebar { position: static !important; min-height: auto !important; border-right: none !important; padding: 10px 16px !important; display: flex !important; gap: 10px !important; align-items: center !important; }
          .demo-sidebar > div:first-child { display: none !important; }
          .demo-sidebar > div:nth-child(2) { display: none !important; }
          .demo-sidebar nav { flex-direction: row !important; overflow-x: auto !important; gap: 4px !important; flex: 1 !important; }
          .demo-sidebar nav > div { white-space: nowrap !important; font-size: 12px !important; padding: 8px 12px !important; flex-shrink: 0 !important; }
          .demo-section { padding: 16px !important; }
          .demo-toast { right: 16px !important; left: 16px !important; bottom: 16px !important; text-align: center !important; }
          .demo-stats-grid { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)) !important; }
          .demo-service-row { flex-wrap: wrap !important; }
          .demo-service-row > div:first-child { width: 100% !important; }
          .demo-appointment-row { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; }
          .demo-chart { gap: 4px !important; }
          .demo-header { flex-direction: column !important; align-items: flex-start !important; }
          .demo-header > div { width: 100% !important; }
        }
        @media(max-width: 480px) {
          .demo-sidebar { padding: 8px 10px !important; gap: 6px !important; }
          .demo-sidebar nav > div { font-size: 11px !important; padding: 6px 10px !important; }
          .demo-section { padding: 12px !important; }
          .demo-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .demo-card { padding: 16px !important; }
          .demo-card h3 { font-size: 14px !important; }
          .demo-toast { font-size: 12px !important; padding: 10px 14px !important; }
        }
      `}</style>

      {/* Header */}
      <div className="demo-header" style={{ padding: '14px 24px', borderBottom: `0.5px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', background: 'rgba(10,10,10,.96)', position: 'sticky', top: 0, zIndex: 20 }}>
        <Link href="/" style={{ color: gold, textDecoration: 'none', fontSize: '22px', fontWeight: 700 }}>SalonPro</Link>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: gold, background: 'rgba(212,175,55,.1)', padding: '6px 14px', borderRadius: '20px' }}>
            🔒 Demo
          </span>
          <Link href="/registracija" style={{ background: `linear-gradient(135deg,${gold},#b8960c)`, color: '#0a0a0a', padding: '10px 18px', borderRadius: '999px', fontWeight: 700, textDecoration: 'none', fontSize: '13px' }}>
            Kreiraj svoj salon
          </Link>
        </div>
      </div>

      <div className="demo-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: 'calc(100vh - 67px)' }}>
        {/* Sidebar */}
        <aside className="demo-sidebar" style={{ borderRight: `0.5px solid ${goldBorder}`, padding: '20px', background: '#0d0d0d', position: 'sticky', top: 67, minHeight: 'calc(100vh - 67px)' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: gold, fontSize: '17px', fontWeight: 700 }}>Salon Elegance</div>
            <div style={{ color: muted, fontSize: '11px', marginTop: '4px' }}>Demo salon</div>
          </div>

          <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(212,175,55,.06)', border: `0.5px solid ${goldBorder}`, marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', color: muted, marginBottom: '2px' }}>PLAN</div>
            <div style={{ fontSize: '12px', color: gold, fontWeight: 500 }}>Pro · 29,99 €/mes</div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {navItems.map(item => (
              <div key={item.id} onClick={() => setAktivan(item.id)} style={{
                padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                color: aktivan === item.id ? '#0a0a0a' : 'rgba(245,240,232,.7)',
                background: aktivan === item.id ? `linear-gradient(135deg,${gold},#b8960c)` : 'transparent',
                fontSize: '13px', fontWeight: aktivan === item.id ? 700 : 400, display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ fontSize: '15px' }}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <section className="demo-section" style={{ padding: '28px', maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
          <DemoBanner />
          <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 600 }}>{navItems.find(n => n.id === aktivan)?.icon} {navItems.find(n => n.id === aktivan)?.label}</h2>

          {/* PREGLED */}
          {aktivan === 'pregled' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="demo-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                {[
                  { icon: '📅', value: '8', label: 'Termini danas' },
                  { icon: '💈', value: '14', label: 'Usluge' },
                  { icon: '📦', value: '37', label: 'Artikala u lageru' },
                  { icon: '👥', value: '126', label: 'Klijenata' },
                  { icon: '⭐', value: '4.8', label: 'Prosječna ocjena' },
                ].map(s => (
                  <div key={s.label} className="demo-card" style={cardStyle}>
                    <div style={{ fontSize: '22px', marginBottom: '8px' }}>{s.icon}</div>
                    <div style={{ fontSize: '26px', color: gold, fontWeight: 700 }}>{s.value}</div>
                    <div style={{ color: muted, fontSize: '12px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="demo-card" style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '14px' }}>Današnji termini</h3>
                {[
                  { time: '09:30', client: 'Ana Marković', service: 'Feniranje', status: 'potvrđen' },
                  { time: '11:00', client: 'Mina Petrović', service: 'Bojenje izrastka', status: 'ceka' },
                  { time: '13:15', client: 'Jovana Ilić', service: 'Manikir gel', status: 'potvrđen' },
                  { time: '15:00', client: 'Sara Nikolić', service: 'Šišanje', status: 'ceka' },
                ].map(t => (
                  <div key={t.time + t.client} className="demo-appointment-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px 0', borderTop: '0.5px solid rgba(255,255,255,.06)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{t.time} · {t.client}</div>
                      <div style={{ color: muted, fontSize: '12px', marginTop: '3px' }}>{t.service}</div>
                    </div>
                    <span style={{ color: t.status === 'potvrđen' ? '#7ddf9a' : gold, fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: t.status === 'potvrđen' ? 'rgba(125,223,154,.1)' : 'rgba(212,175,55,.1)', height: 'fit-content' }}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ANALITIKA */}
          {aktivan === 'analitika' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="demo-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {[
                  { label: 'Prihod (30 dana)', value: '346.500 RSD' },
                  { label: 'Rashodi (30 dana)', value: '89.200 RSD' },
                  { label: 'Profit', value: '257.300 RSD' },
                  { label: 'Broj termina', value: '84' },
                ].map(s => (
                  <div key={s.label} className="demo-card" style={cardStyle}>
                    <div style={{ fontSize: '13px', color: muted, marginBottom: '8px' }}>{s.label}</div>
                    <div style={{ fontSize: '22px', color: gold, fontWeight: 700 }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="demo-card" style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '14px' }}> Nedjeljni termini <span style={{ fontSize: '13px', color: muted, fontWeight: 400 }}>(prosjek: 21)</span></h3>
                <div className="demo-chart" style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  {[{ d: 'Pon', v: 18 }, { d: 'Uto', v: 24 }, { d: 'Sri', v: 22 }, { d: 'Čet', v: 19 }, { d: 'Pet', v: 28 }, { d: 'Sub', v: 15 }].map(day => (
                    <div key={day.d} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: `${day.v * 3}px`, background: `linear-gradient(180deg,${gold},#b8960c)`, borderRadius: '6px 6px 0 0', maxHeight: '100px', minHeight: '20px' }} />
                      <div style={{ fontSize: '11px', color: muted, marginTop: '6px' }}>{day.d}</div>
                      <div style={{ fontSize: '10px', color: gold }}>{day.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* NALOG */}
          {aktivan === 'nalog' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="demo-card" style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '16px' }}>Nalog (account)</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: muted, display: 'block', marginBottom: '4px', letterSpacing: '.08em' }}>EMAIL</label>
                    <div style={{ fontSize: '14px', color: text }}>demo@salon-elegance.com</div>
                  </div>
                  <button style={btnOutline} disabled>Promijeni lozinku</button>
                </div>
              </div>
              <div className="demo-card" style={{ ...cardStyle, maxWidth: '520px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '12px' }}>🏆 Istaknuti radovi</h3>
                <p style={{ fontSize: '12px', color: muted, marginBottom: '14px' }}>Slike prikazane na javnoj stranici.</p>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                  {[{ color: '#2a1f00' }, { color: '#1f2a00' }, { color: '#2a0015' }].map((s, i) => (
                    <div key={i} style={{ width: '70px', height: '52px', borderRadius: '6px', background: s.color, flexShrink: 0 }} />
                  ))}
                </div>
                <button style={btnGold} onClick={() => showToast('Demo: dodavanje slika nije dostupno')}>➕ Dodaj sliku</button>
              </div>
              <div className="demo-card" style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '10px' }}>Preporuke i popusti</h3>
                <p style={{ fontSize: '12px', color: muted, lineHeight: 1.55, marginBottom: '12px' }}>
                  Podijeli link sa kolegama. Kada se 3 nova salona registruju preko tvog koda, godišnja pretplata je <strong style={{ color: gold }}>254 €</strong> umjesto 299 €.
                </p>
                <div style={{ fontSize: '20px', fontWeight: 600, color: gold, letterSpacing: '2px' }}>ELEGANCE10</div>
              </div>
            </div>
          )}

          {/* USLUGE */}
          {aktivan === 'usluge' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="demo-card" style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '14px' }}>💈 Usluge</h3>
                {[
                  { name: 'Šišanje', price: '1.200 RSD', dur: '30 min' },
                  { name: 'Feniranje', price: '1.600 RSD', dur: '25 min' },
                  { name: 'Bojenje izrastka', price: '4.200 RSD', dur: '60 min' },
                  { name: 'Bojenje cijele dužine', price: '6.800 RSD', dur: '90 min' },
                  { name: 'Manikir gel', price: '2.800 RSD', dur: '45 min' },
                  { name: 'Pedikir', price: '2.200 RSD', dur: '40 min' },
                ].map(u => (
                  <div key={u.name} className="demo-service-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '0.5px solid rgba(255,255,255,.06)', gap: '12px' }}>
                    <div><strong style={{ fontSize: '14px' }}>{u.name}</strong></div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <span style={{ color: muted, fontSize: '12px' }}>{u.dur}</span>
                      <span style={{ color: gold, fontWeight: 600, fontSize: '14px' }}>{u.price}</span>
                    </div>
                  </div>
                ))}
                <button style={{ ...btnGold, marginTop: '16px' }} onClick={() => showToast('Demo: dodavanje usluga nije dostupno')}>➕ Dodaj uslugu</button>
              </div>
            </div>
          )}

          {/* ZAPOSLENI */}
          {aktivan === 'zaposleni' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="demo-card" style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '14px' }}>✂️ Zaposleni</h3>
                {[
                  { name: 'Marija Petrović', role: 'Frizer', phone: '062/123-456' },
                  { name: 'Jelena Nikolić', role: 'Manikir', phone: '063/789-012' },
                  { name: 'Marko Jovanović', role: 'Frizer', phone: '061/345-678' },
                ].map(z => (
                  <div key={z.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderTop: '0.5px solid rgba(255,255,255,.06)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(212,175,55,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>✂️</div>
                    <div style={{ flex: 1 }}>
                      <div><strong>{z.name}</strong></div>
                      <div style={{ color: muted, fontSize: '12px' }}>{z.role} · {z.phone}</div>
                    </div>
                  </div>
                ))}
                <button style={{ ...btnGold, marginTop: '16px' }} onClick={() => showToast('Demo: dodavanje zaposlenih nije dostupno')}>➕ Dodaj zaposlenog</button>
              </div>
            </div>
          )}

          {/* LAGER */}
          {aktivan === 'lager' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="demo-card" style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '14px' }}>📦 Lager</h3>
                {[
                  { name: 'Farba #6.1', amount: '8 kom', min: '4 kom', low: false },
                  { name: 'Hidrogen 6%', amount: '1.2 L', min: '1 L', low: false },
                  { name: 'Šampon keratin', amount: '420 ml', min: '300 ml', low: false },
                  { name: 'Maska za kosu', amount: '180 ml', min: '200 ml', low: true },
                  { name: 'Gel baza', amount: '3 kom', min: '5 kom', low: true },
                ].map(a => (
                  <div key={a.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '0.5px solid rgba(255,255,255,.06)', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: a.low ? 600 : 400 }}>{a.name} {a.low && <span style={{ color: '#e07a7a', fontSize: '11px' }}>(niska zaliha)</span>}</div>
                      <div style={{ color: muted, fontSize: '11px', marginTop: '2px' }}>Min: {a.min}</div>
                    </div>
                    <span style={{ color: a.low ? '#e07a7a' : gold, fontWeight: 700 }}>{a.amount}</span>
                  </div>
                ))}
                <button style={{ ...btnGold, marginTop: '16px' }} onClick={() => showToast('Demo: dodavanje artikala nije dostupno')}>➕ Dodaj artikal</button>
              </div>
            </div>
          )}

          {/* TERMINI */}
          {aktivan === 'termini' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="demo-card" style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '14px' }}>📅 Termini <span style={{ fontSize: '13px', color: muted, fontWeight: 400 }}>(danas)</span></h3>
                {[
                  { time: '09:30', client: 'Ana Marković', service: 'Feniranje', phone: '062/111-222', status: 'potvrđen' },
                  { time: '11:00', client: 'Mina Petrović', service: 'Bojenje izrastka', phone: '063/333-444', status: 'ceka' },
                  { time: '13:15', client: 'Jovana Ilić', service: 'Manikir gel', phone: '061/555-666', status: 'potvrđen' },
                  { time: '15:00', client: 'Sara Nikolić', service: 'Šišanje', phone: '062/777-888', status: 'otkazan' },
                ].map(t => (
                  <div key={t.time + t.client} className="demo-appointment-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '0.5px solid rgba(255,255,255,.06)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{t.time} · {t.client}</div>
                      <div style={{ color: muted, fontSize: '12px', marginTop: '2px' }}>{t.service} · {t.phone}</div>
                    </div>
                    <span style={{ color: t.status === 'potvrđen' ? '#7ddf9a' : t.status === 'otkazan' ? '#e07a7a' : gold, fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(255,255,255,.04)' }}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RECENZIJE */}
          {aktivan === 'recenzije' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="demo-card" style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '14px' }}>⭐ Recenzije <span style={{ fontSize: '13px', color: muted, fontWeight: 400 }}>(4.8 · 24 recenzije)</span></h3>
                {[
                  { name: 'Ana M.', rating: 5, comment: 'Odličan salon, ljubazno osoblje i vrhunska usluga!', reply: null },
                  { name: 'Petar N.', rating: 4, comment: 'Zadovoljan sam uslugom, samo malo čekanje.', reply: 'Hvala na povratnim informacijama, radimo na tome!' },
                  { name: 'Jelena K.', rating: 5, comment: 'Najbolji frizer u gradu! Preporučujem svima.', reply: null },
                ].map(r => (
                  <div key={r.name} style={{ padding: '14px 0', borderTop: '0.5px solid rgba(255,255,255,.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', color: gold, letterSpacing: '2px' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      <span style={{ fontSize: '12px', color: muted }}>{r.name}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(245,240,232,.7)', margin: '6px 0', lineHeight: 1.5 }}>{r.comment}</p>
                    {r.reply && (
                      <div style={{ padding: '8px 12px', background: 'rgba(212,175,55,.05)', borderRadius: '8px', border: '0.5px solid rgba(212,175,55,.1)', marginTop: '6px' }}>
                        <div style={{ fontSize: '10px', color: gold, marginBottom: '2px' }}>Odgovor salona:</div>
                        <div style={{ fontSize: '12px', color: 'rgba(245,240,232,.6)' }}>{r.reply}</div>
                      </div>
                    )}
                    <button style={{ ...btnOutline, marginTop: '6px', padding: '6px 12px', fontSize: '11px' }} onClick={() => showToast('Demo: odgovaranje nije dostupno')}>Odgovori</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MOJA STRANICA */}
          {aktivan === 'stranica' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="demo-card" style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '14px' }}>🔗 Moja javna stranica</h3>
                <p style={{ fontSize: '12px', color: muted, lineHeight: 1.55, marginBottom: '16px' }}>
                  Tvoja javna stranica gdje klijenti mogu vidjeti usluge, zakazati termin, ostaviti recenziju i još mnogo toga.
                </p>
                <div style={{ background: 'rgba(212,175,55,.1)', border: `0.5px solid ${goldBorder}`, borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ color: muted, fontSize: '11px', marginBottom: '6px' }}>JAVNI LINK</div>
                  <div style={{ color: gold, fontSize: '15px', wordBreak: 'break-all' }}>https://salonpro.com/salon/elegance</div>
                </div>
                <button style={btnGold} onClick={() => { navigator.clipboard.writeText('https://salonpro.com/salon/elegance'); showToast('Link kopiran (demo)') }}>
                  Kopiraj link
                </button>
              </div>
              <div className="demo-card" style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '14px' }}>🎨 Izgled stranice</h3>
                <p style={{ fontSize: '12px', color: muted, lineHeight: 1.55, marginBottom: '16px' }}>
                  Prilagodi boje i izgled svoje javne stranice.
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {['#d4af37', '#c0392b', '#2980b9', '#27ae60'].map(c => (
                    <div key={c} style={{ width: '36px', height: '36px', borderRadius: '50%', background: c, cursor: 'pointer', border: c === '#d4af37' ? '2px solid #fff' : 'none' }} onClick={() => showToast('Demo: izmjena boja nije dostupna')} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LOJALNOST */}
          {aktivan === 'lojalnost' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="demo-card" style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '14px' }}>🎁 Lojalnost</h3>
                <p style={{ fontSize: '12px', color: muted, lineHeight: 1.55, marginBottom: '16px' }}>
                  Nagradi vjerne klijente — svaki <strong style={{ color: text }}>5. termin</strong> donosi popust od <strong style={{ color: gold }}>15%</strong>.
                </p>
                <div style={{ background: 'rgba(212,175,55,.06)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: muted, marginBottom: '8px' }}>LOJALNOST AKTIVNA</div>
                  <div style={{ fontSize: '13px', color: '#7ddf9a' }}>✓ Aktivno — svaki 5. termin 15% popusta</div>
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '12px', color: muted, marginBottom: '8px' }}>PRIMJER NAPRETKA KLIJENATA:</div>
                    {[{ name: 'Ana M.', progress: 4 }, { name: 'Mina P.', progress: 2 }, { name: 'Jovana I.', progress: 5, completed: true }].map(c => (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', width: '70px' }}>{c.name}</span>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${(c.progress / 5) * 100}%`, height: '100%', background: c.completed ? '#7ddf9a' : gold, borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: c.completed ? '#7ddf9a' : gold }}>{c.progress}/5</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button style={btnGold} onClick={() => showToast('Demo: izmjena lojalnosti nije dostupna')}>Uredi lojalnost</button>
              </div>
            </div>
          )}

        </section>
      </div>

      <DemoToast msg={toast} show={toastShow} />
    </main>
  )
}
