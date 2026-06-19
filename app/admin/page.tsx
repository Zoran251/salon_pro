'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { waitForClientSession } from '@/lib/wait-client-session'
import { isPlatformAdminEmail } from '@/lib/platform-admin'
import { DEFAULT_BRAND_COLORS } from '@/lib/hex-color'
import type { Database } from '@/lib/supabase'

type SalonRow = Database['public']['Tables']['saloni']['Row']

type AdminSalonForm = {
  id: string
  naziv: string
  slug: string
  email: string
  telefon: string
  grad: string
  tip: string
  aktivan: boolean
  opis: string
  adresa: string
  radno_od: string
  radno_do: string
  logo_url: string
  boja_primarna: string
  boja_sekundarna: string
  boja_akcent: string
  boja_font: string
}

function salonToForm(s: SalonRow): AdminSalonForm {
  return {
    id: s.id,
    naziv: s.naziv || '',
    slug: s.slug || '',
    email: s.email || '',
    telefon: s.telefon || '',
    grad: s.grad || '',
    tip: s.tip || '',
    aktivan: s.aktivan ?? true,
    opis: s.opis || '',
    adresa: s.adresa || '',
    radno_od: s.radno_od || '09:00',
    radno_do: s.radno_do || '20:00',
    logo_url: s.logo_url || '',
    boja_primarna: s.boja_primarna || DEFAULT_BRAND_COLORS.primarna,
    boja_sekundarna: s.boja_sekundarna || DEFAULT_BRAND_COLORS.sekundarna,
    boja_akcent: s.boja_akcent || DEFAULT_BRAND_COLORS.akcent,
    boja_font: s.boja_font || DEFAULT_BRAND_COLORS.font,
  }
}

const emptyForm = (): AdminSalonForm => ({
  id: '',
  naziv: '',
  slug: '',
  email: '',
  telefon: '',
  grad: '',
  tip: '',
  aktivan: true,
  opis: '',
  adresa: '',
  radno_od: '09:00',
  radno_do: '20:00',
  logo_url: '',
  boja_primarna: DEFAULT_BRAND_COLORS.primarna,
  boja_sekundarna: DEFAULT_BRAND_COLORS.sekundarna,
  boja_akcent: DEFAULT_BRAND_COLORS.akcent,
  boja_font: DEFAULT_BRAND_COLORS.font,
})

export default function AdminPage() {
  const router = useRouter()
  const [ucitavanje, setUcitavanje] = useState(true)
  const [autorizovan, setAutorizovan] = useState(false)
  const [saloni, setSaloni] = useState<SalonRow[]>([])
  const [forma, setForma] = useState<AdminSalonForm>(emptyForm())
  const [greska, setGreska] = useState('')
  const [uspjeh, setUspjeh] = useState('')
  const [cuvanje, setCuvanje] = useState(false)
  const [pretraga, setPretraga] = useState('')

  const gold = '#d4af37'
  const goldBorder = 'rgba(212,175,55,.25)'
  const muted = 'rgba(245,240,232,.45)'
  const text = '#f5f0e8'
  const cardStyle: React.CSSProperties = {
    background: '#111',
    border: `0.5px solid ${goldBorder}`,
    borderRadius: '16px',
    padding: '20px',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#1a1a1a',
    border: `0.5px solid ${goldBorder}`,
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '14px',
    color: text,
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: muted,
    display: 'block',
    marginBottom: '5px',
    letterSpacing: '.3px',
  }

  const ucitajSalone = useCallback(async (token: string) => {
    const res = await fetch('/api/admin/saloni', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = (await res.json()) as { saloni?: SalonRow[]; error?: string }
    if (!res.ok) throw new Error(json.error || 'Greška pri učitavanju salona.')
    setSaloni(json.saloni || [])
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const session = await waitForClientSession()
        if (cancelled) return
        if (!session?.user) {
          router.replace('/login')
          return
        }
        if (!isPlatformAdminEmail(session.user.email)) {
          router.replace('/dashboard')
          return
        }
        setAutorizovan(true)
        await ucitajSalone(session.access_token)
      } catch (e) {
        if (!cancelled) {
          setGreska(e instanceof Error ? e.message : 'Greška pri učitavanju.')
        }
      } finally {
        if (!cancelled) setUcitavanje(false)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [router, ucitajSalone])

  const odaberiSalon = (s: SalonRow) => {
    setForma(salonToForm(s))
    setGreska('')
    setUspjeh('')
  }

  const sacuvaj = async () => {
    if (!forma.id) {
      setGreska('Izaberite salon iz liste.')
      return
    }
    setCuvanje(true)
    setGreska('')
    setUspjeh('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setGreska('Sesija je istekla. Prijavite se ponovo.')
        return
      }
      const res = await fetch('/api/admin/saloni', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(forma),
      })
      const json = (await res.json()) as { salon?: SalonRow; error?: string }
      if (!res.ok) {
        setGreska(json.error || 'Čuvanje nije uspjelo.')
        return
      }
      if (json.salon) {
        setSaloni(prev => prev.map(s => (s.id === json.salon!.id ? json.salon! : s)))
        setForma(salonToForm(json.salon))
      }
      setUspjeh('Salon je uspješno sačuvan.')
      setTimeout(() => setUspjeh(''), 3000)
    } catch (e) {
      setGreska(e instanceof Error ? e.message : 'Greška pri čuvanju.')
    } finally {
      setCuvanje(false)
    }
  }

  const odjava = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filtrirani = saloni.filter(s => {
    const q = pretraga.trim().toLowerCase()
    if (!q) return true
    return (
      s.naziv?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.grad?.toLowerCase().includes(q) ||
      s.slug?.toLowerCase().includes(q)
    )
  })

  if (ucitavanje) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, fontFamily: 'sans-serif' }}>
        Učitavanje admin panela…
      </div>
    )
  }

  if (!autorizovan) return null

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: text, fontFamily: 'sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: `0.5px solid ${goldBorder}`, background: 'rgba(10,10,10,.97)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ fontSize: '20px', fontWeight: 500, color: gold, textDecoration: 'none' }}>SalonPro</Link>
          <span style={{ fontSize: '13px', color: muted }}>Admin panel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={odjava} style={{ background: 'transparent', border: `0.5px solid ${goldBorder}`, color: muted, padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>
            Odjava
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: '20px' }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '12px' }}>Saloni ({saloni.length})</h2>
          <input
            style={{ ...inputStyle, marginBottom: '12px' }}
            placeholder="Pretraga po nazivu, emailu, gradu…"
            value={pretraga}
            onChange={e => setPretraga(e.target.value)}
          />
          <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filtrirani.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => odaberiSalon(s)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `0.5px solid ${forma.id === s.id ? gold : goldBorder}`,
                  background: forma.id === s.id ? 'rgba(212,175,55,.1)' : '#1a1a1a',
                  color: text,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{s.naziv}</div>
                <div style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>{s.email}</div>
                <div style={{ fontSize: '11px', color: muted }}>{s.grad || '—'} · {s.aktivan ? 'aktivan' : 'neaktivan'}</div>
              </button>
            ))}
            {filtrirani.length === 0 && (
              <p style={{ fontSize: '13px', color: muted, padding: '12px 0' }}>Nema salona za prikaz.</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {greska && (
            <div style={{ background: 'rgba(220,50,50,.1)', border: '0.5px solid rgba(220,50,50,.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#ff6b6b' }}>
              {greska}
            </div>
          )}
          {uspjeh && (
            <div style={{ background: 'rgba(50,200,100,.1)', border: '0.5px solid rgba(50,200,100,.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#4caf81' }}>
              {uspjeh}
            </div>
          )}

          {!forma.id ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛠</div>
              <p style={{ color: muted, fontSize: '14px' }}>Izaberite salon sa liste za uređivanje podataka.</p>
            </div>
          ) : (
            <>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '16px' }}>Osnovni podaci</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px' }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>ID (samo čitanje)</label>
                    <input style={{ ...inputStyle, opacity: 0.7 }} value={forma.id} readOnly />
                  </div>
                  {([
                    { label: 'NAZIV', key: 'naziv' as const },
                    { label: 'SLUG', key: 'slug' as const },
                    { label: 'EMAIL', key: 'email' as const },
                    { label: 'TELEFON', key: 'telefon' as const },
                    { label: 'GRAD', key: 'grad' as const },
                    { label: 'TIP', key: 'tip' as const },
                  ]).map(f => (
                    <div key={f.key}>
                      <label style={labelStyle}>{f.label}</label>
                      <input style={inputStyle} value={forma[f.key]} onChange={e => setForma({ ...forma, [f.key]: e.target.value })} />
                    </div>
                  ))}
                  <div>
                    <label style={labelStyle}>AKTIVAN</label>
                    <select
                      style={inputStyle}
                      value={forma.aktivan ? 'da' : 'ne'}
                      onChange={e => setForma({ ...forma, aktivan: e.target.value === 'da' })}
                    >
                      <option value="da">Da</option>
                      <option value="ne">Ne</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>ADRESA</label>
                    <input style={inputStyle} value={forma.adresa} onChange={e => setForma({ ...forma, adresa: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>OPIS</label>
                    <textarea
                      style={{ ...inputStyle, height: '80px', resize: 'none' }}
                      value={forma.opis}
                      onChange={e => setForma({ ...forma, opis: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '16px' }}>Radno vreme i logo</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>RADI OD</label>
                    <input style={inputStyle} type="time" value={forma.radno_od} onChange={e => setForma({ ...forma, radno_od: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>RADI DO</label>
                    <input style={inputStyle} type="time" value={forma.radno_do} onChange={e => setForma({ ...forma, radno_do: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>LOGO URL (ili base64)</label>
                    <input style={inputStyle} value={forma.logo_url} onChange={e => setForma({ ...forma, logo_url: e.target.value })} />
                  </div>
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '16px' }}>Brend boje</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px' }}>
                  {([
                    { label: 'PRIMARNA', key: 'boja_primarna' as const },
                    { label: 'SEKUNDARNA', key: 'boja_sekundarna' as const },
                    { label: 'AKCENT', key: 'boja_akcent' as const },
                    { label: 'BOJA TEKSTA', key: 'boja_font' as const },
                  ]).map(f => (
                    <div key={f.key}>
                      <label style={labelStyle}>{f.label}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="color"
                          value={forma[f.key]}
                          onChange={e => setForma({ ...forma, [f.key]: e.target.value })}
                          style={{ width: '44px', height: '44px', padding: 0, border: `0.5px solid ${goldBorder}`, borderRadius: '10px', cursor: 'pointer' }}
                        />
                        <input style={{ ...inputStyle, flex: 1 }} value={forma[f.key]} onChange={e => setForma({ ...forma, [f.key]: e.target.value })} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '14px', borderRadius: '12px', background: forma.boja_sekundarna, border: `0.5px solid ${goldBorder}` }}>
                  <span style={{ padding: '8px 14px', borderRadius: '8px', background: forma.boja_primarna, color: '#0a0a0a', fontSize: '12px', fontWeight: 600 }}>Primarna</span>
                  <span style={{ padding: '8px 14px', borderRadius: '8px', background: forma.boja_akcent, color: '#0a0a0a', fontSize: '12px', fontWeight: 600 }}>Akcent</span>
                  <span style={{ padding: '8px 14px', borderRadius: '8px', color: forma.boja_font, fontSize: '13px' }}>Primjer teksta</span>
                </div>
              </div>

              {forma.slug && (
                <div style={{ fontSize: '12px', color: muted }}>
                  Javna stranica:{' '}
                  <Link href={`/salon/${forma.slug}`} target="_blank" style={{ color: gold }}>
                    /salon/{forma.slug}
                  </Link>
                </div>
              )}

              <button
                onClick={sacuvaj}
                disabled={cuvanje}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: `linear-gradient(135deg,${gold},#b8960c)`,
                  color: '#0a0a0a',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: cuvanje ? 'wait' : 'pointer',
                  opacity: cuvanje ? 0.7 : 1,
                }}
              >
                {cuvanje ? 'Čuvanje…' : 'Sačuvaj salon ✓'}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media(max-width:900px){
          div[style*="grid-template-columns: minmax(260px"]{grid-template-columns:1fr!important}
        }
        select option{background:#1a1a1a;color:#f5f0e8}
      `}</style>
    </div>
  )
}
