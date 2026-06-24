'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { waitForClientSession } from '@/lib/wait-client-session'
import { isPlatformAdminEmail } from '@/lib/platform-admin'
import { DEFAULT_BRAND_COLORS } from '@/lib/hex-color'

type AdminTab = 'saloni' | 'usluge' | 'lager' | 'termini' | 'zaposleni' | 'rashodi' | 'lojalnost'

interface AdminDataRow {
  id: string
  [key: string]: unknown
}

const TAB_LABELS: Record<AdminTab, string> = {
  saloni: 'Saloni',
  usluge: 'Usluge',
  lager: 'Lager',
  termini: 'Termini',
  zaposleni: 'Zaposleni',
  rashodi: 'Rashodi',
  lojalnost: 'Lojalnost',
}

async function fetchToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Sesija je istekla.')
  return session.access_token
}

async function apiGet(token: string, table: string) {
  const res = await fetch(`/api/admin/data?table=${table}`, { headers: { Authorization: `Bearer ${token}` } })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Greška')
  return json.data as AdminDataRow[]
}

async function apiSave(token: string, table: string, data: Record<string, unknown>, id?: string) {
  const method = id ? 'PATCH' : 'POST'
  const res = await fetch('/api/admin/data', {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(id ? { ...data, _table: table, id } : { ...data, _table: table }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Čuvanje nije uspjelo.')
  return json.data as AdminDataRow
}

async function apiDelete(token: string, table: string, id: string) {
  const res = await fetch(`/api/admin/data?table=${table}&id=${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Brisanje nije uspjelo.')
  return json
}

export default function AdminPage() {
  const router = useRouter()
  const [ucitavanje, setUcitavanje] = useState(true)
  const [autorizovan, setAutorizovan] = useState(false)
  const [aktivnaTabela, setAktivnaTabela] = useState<AdminTab>('saloni')
  const [podaci, setPodaci] = useState<AdminDataRow[]>([])
  const [forma, setForma] = useState<Record<string, string>>({})
  const [greska, setGreska] = useState('')
  const [uspjeh, setUspjeh] = useState('')
  const [cuvanje, setCuvanje] = useState(false)

  const gold = '#d4af37'
  const goldBorder = 'rgba(212,175,55,.25)'
  const muted = 'rgba(245,240,232,.45)'
  const text = '#f5f0e8'

  const cardStyle: React.CSSProperties = { background: '#111', border: `0.5px solid ${goldBorder}`, borderRadius: '16px', padding: '20px' }
  const inputStyle: React.CSSProperties = { width: '100%', background: '#1a1a1a', border: `0.5px solid ${goldBorder}`, borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: text }
  const labelStyle: React.CSSProperties = { fontSize: '11px', color: muted, display: 'block', marginBottom: '5px', letterSpacing: '.3px' }

  const ucitajPodatke = useCallback(async (token: string, tabela: string) => {
    const data = await apiGet(token, tabela)
    setPodaci(data)
    setForma({})
    setGreska('')
    setUspjeh('')
  }, [])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const session = await waitForClientSession()
        if (cancelled) return
        if (!session?.user) { router.replace('/login'); return }
        if (!isPlatformAdminEmail(session.user.email)) { router.replace('/dashboard'); return }
        setAutorizovan(true)
        await ucitajPodatke(session.access_token, 'saloni')
      } catch (e) {
        if (!cancelled) setGreska(e instanceof Error ? e.message : 'Greška.')
      } finally { if (!cancelled) setUcitavanje(false) }
    }
    void init()
    return () => { cancelled = true }
  }, [router, ucitajPodatke])

  const promijeniTabelu = async (tab: AdminTab) => {
    setAktivnaTabela(tab)
    setGreska('')
    setUspjeh('')
    try {
      const token = await fetchToken()
      await ucitajPodatke(token, tab)
    } catch (e) { setGreska(e instanceof Error ? e.message : 'Greška.') }
  }

  const izaberiRed = (row: AdminDataRow) => {
    const flat: Record<string, string> = {}
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      flat[k] = v === null || v === undefined ? '' : String(v)
    }
    setForma(flat)
    setGreska('')
    setUspjeh('')
  }

  const noviRed = () => {
    setForma({})
    setGreska('')
    setUspjeh('')
  }

  const sacuvaj = async () => {
    setCuvanje(true)
    setGreska('')
    setUspjeh('')
    try {
      const token = await fetchToken()
      const id = forma.id || ''
      const data = { ...forma }
      if ((aktivnaTabela === 'lojalnost' || aktivnaTabela === 'saloni') && data.aktivan !== undefined) {
        data.aktivan = String(data.aktivan) === 'true' ? 'true' : 'false'
      }
      const saved = await apiSave(token, aktivnaTabela, data, id || undefined)
      setUspjeh('Podaci sačuvani.')
      setTimeout(() => setUspjeh(''), 3000)
      await ucitajPodatke(token, aktivnaTabela)
      if (saved?.id) izaberiRed(saved)
    } catch (e) { setGreska(e instanceof Error ? e.message : 'Greška.') }
    finally { setCuvanje(false) }
  }

  const obrisi = async (id: string) => {
    if (!confirm('Sigurno obrišite ovaj red?')) return
    try {
      const token = await fetchToken()
      await apiDelete(token, aktivnaTabela, id)
      setUspjeh('Red obrisan.')
      setForma({})
      setTimeout(() => setUspjeh(''), 3000)
      await ucitajPodatke(token, aktivnaTabela)
    } catch (e) { setGreska(e instanceof Error ? e.message : 'Greška.') }
  }

  const odjava = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getFields = (): string[] => {
    if (podaci.length === 0 && Object.keys(forma).length === 0) {
      const defaults: Record<AdminTab, string[]> = {
        saloni: ['id', 'naziv', 'slug', 'email', 'telefon', 'grad', 'tip', 'aktivan', 'opis', 'adresa', 'radno_od', 'radno_do', 'logo_url', 'boja_primarna', 'boja_sekundarna', 'boja_akcent', 'boja_font'],
        usluge: ['id', 'salon_id', 'naziv', 'cijena', 'trajanje', 'opis', 'kategorija', 'aktivan'],
        lager: ['id', 'salon_id', 'naziv', 'kategorija', 'kolicina', 'minimum', 'jedinica'],
        termini: ['id', 'salon_id', 'client_id', 'zaposleni_id', 'usluga_id', 'ime_klijenta', 'telefon_klijenta', 'datum_vrijeme', 'napomena', 'status'],
        zaposleni: ['id', 'salon_id', 'ime', 'uloga', 'foto_url', 'aktivan'],
        rashodi: ['id', 'salon_id', 'naziv', 'iznos', 'kategorija', 'datum', 'napomena'],
        lojalnost: ['id', 'salon_id', 'aktivan', 'tip', 'svaki_koji', 'vrijednost'],
      }
      return defaults[aktivnaTabela] || []
    }
    const keys = new Set<string>()
    if (podaci.length > 0) Object.keys(podaci[0]).forEach(k => keys.add(k))
    Object.keys(forma).forEach(k => keys.add(k))
    return Array.from(keys)
  }

  if (ucitavanje) {
    return <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, fontFamily: 'sans-serif' }}>Učitavanje admin panela…</div>
  }

  if (!autorizovan) return null

  const fields = getFields()
  const tabNav: AdminTab[] = ['saloni', 'usluge', 'lager', 'termini', 'zaposleni', 'rashodi', 'lojalnost']
  const ignoreFields = new Set(['created_at', 'updated_at', '_table'])

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: text, fontFamily: 'sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: `0.5px solid ${goldBorder}`, background: 'rgba(10,10,10,.97)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ fontSize: '20px', fontWeight: 500, color: gold, textDecoration: 'none' }}>SalonPro</Link>
          <span style={{ fontSize: '13px', color: muted }}>Admin panel</span>
        </div>
        <button onClick={odjava} style={{ background: 'transparent', border: `0.5px solid ${goldBorder}`, color: muted, padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>Odjava</button>
      </nav>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {tabNav.map(t => (
            <button key={t} onClick={() => void promijeniTabelu(t)}
              style={{
                padding: '10px 18px', borderRadius: '10px', border: `0.5px solid ${aktivnaTabela === t ? gold : goldBorder}`,
                background: aktivnaTabela === t ? 'rgba(212,175,55,.12)' : '#111', color: aktivnaTabela === t ? gold : muted,
                cursor: 'pointer', fontSize: '13px', fontWeight: aktivnaTabela === t ? 600 : 400, fontFamily: 'sans-serif',
              }}
            >{TAB_LABELS[t]}</button>
          ))}
        </div>

        {greska && <div style={{ background: 'rgba(220,50,50,.1)', border: '0.5px solid rgba(220,50,50,.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#ff6b6b' }}>{greska}</div>}
        {uspjeh && <div style={{ background: 'rgba(50,200,100,.1)', border: '0.5px solid rgba(50,200,100,.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#4caf81' }}>{uspjeh}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 1.5fr)', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500 }}>{TAB_LABELS[aktivnaTabela]} ({podaci.length})</h2>
              <button onClick={noviRed} style={{ background: 'transparent', border: `0.5px solid ${goldBorder}`, color: gold, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif' }}>+ Novi</button>
            </div>
            <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {podaci.map(row => {
                const prikaz = [row.naziv, row.ime, row.email, String(row.id).slice(0, 8)].filter(Boolean)[0] || String(row.id).slice(0, 8)
                return (
                  <button key={String(row.id)} type="button" onClick={() => izaberiRed(row)}
                    style={{
                      textAlign: 'left', padding: '10px 12px', borderRadius: '8px',
                      border: `0.5px solid ${forma.id === String(row.id) ? gold : goldBorder}`,
                      background: forma.id === String(row.id) ? 'rgba(212,175,55,.1)' : '#1a1a1a',
                      color: text, cursor: 'pointer', fontSize: '13px', fontFamily: 'sans-serif',
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{String(prikaz)}</div>
                    <div style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>{String(row.id).slice(0, 8)}…</div>
                  </button>
                )
              })}
              {podaci.length === 0 && <p style={{ fontSize: '13px', color: muted, padding: '12px 0' }}>Nema podataka.</p>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.keys(forma).length === 0 && !podaci.some(r => r.id === forma.id) ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                <p style={{ color: muted, fontSize: '14px' }}>Izaberite red za uređivanje ili kreirajte novi.</p>
              </div>
            ) : (
              <>
                <div style={cardStyle}>
                  <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '16px' }}>
                    {forma.id ? `Uređivanje: ${forma.naziv || forma.ime || forma.id}` : 'Novi unos'}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px' }}>
                    {fields.filter(f => !ignoreFields.has(f)).map(f => {
                      const isColor = f.startsWith('boja_')
                      const isBool = f === 'aktivan'
                      const isId = f === 'id'
                      const isTime = f.includes('radno_') || f.includes('_od') || f.includes('_do')
                      const isLarge = f === 'opis' || f === 'napomena'

                      if (isId) {
                        return (
                          <div key={f}>
                            <label style={labelStyle}>{f.toUpperCase()}</label>
                            <input style={{ ...inputStyle, opacity: 0.6 }} value={forma[f] || ''} readOnly />
                          </div>
                        )
                      }

                      if (isColor) {
                        return (
                          <div key={f}>
                            <label style={labelStyle}>{f.toUpperCase()}</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input type="color" value={forma[f] || '#d4af37'}
                                onChange={e => setForma({ ...forma, [f]: e.target.value })}
                                style={{ width: '40px', height: '40px', padding: 0, border: `0.5px solid ${goldBorder}`, borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
                              <input style={{ ...inputStyle, flex: 1 }} value={forma[f] || ''}
                                onChange={e => setForma({ ...forma, [f]: e.target.value })} />
                            </div>
                          </div>
                        )
                      }

                      if (isBool) {
                        return (
                          <div key={f}>
                            <label style={labelStyle}>{f.toUpperCase()}</label>
                            <select style={inputStyle} value={String(forma[f]) === 'true' ? 'true' : 'false'}
                              onChange={e => setForma({ ...forma, [f]: e.target.value })}
                            >
                              <option value="true">Da</option>
                              <option value="false">Ne</option>
                            </select>
                          </div>
                        )
                      }

                      if (isTime) {
                        return (
                          <div key={f}>
                            <label style={labelStyle}>{f.toUpperCase()}</label>
                            <input style={inputStyle} type="time" value={forma[f] || ''}
                              onChange={e => setForma({ ...forma, [f]: e.target.value })} />
                          </div>
                        )
                      }

                      if (isLarge) {
                        return (
                          <div key={f} style={{ gridColumn: '1/-1' }}>
                            <label style={labelStyle}>{f.toUpperCase()}</label>
                            <textarea style={{ ...inputStyle, height: '80px', resize: 'none' }}
                              value={forma[f] || ''} onChange={e => setForma({ ...forma, [f]: e.target.value })} />
                          </div>
                        )
                      }

                      const isNumeric = f === 'cijena' || f === 'iznos' || f === 'kolicina' || f === 'minimum' || f === 'svaki_koji' || f === 'vrijednost' || f === 'trajanje'
                      return (
                        <div key={f}>
                          <label style={labelStyle}>{f.toUpperCase()}</label>
                          <input style={inputStyle} type={isNumeric ? 'number' : 'text'}
                            value={forma[f] || ''}
                            onChange={e => setForma({ ...forma, [f]: e.target.value })} />
                        </div>
                      )
                    })}
                  </div>
                  {aktivnaTabela === 'saloni' && forma.slug && (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: muted }}>
                      Stranica: <Link href={`/salon/${forma.slug}`} target="_blank" style={{ color: gold }}>/salon/{forma.slug}</Link>
                    </div>
                  )}
                  {aktivnaTabela === 'saloni' && forma.boja_sekundarna && (
                    <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '14px', borderRadius: '12px', background: forma.boja_sekundarna || '#121212', border: `0.5px solid ${goldBorder}` }}>
                      <span style={{ padding: '8px 14px', borderRadius: '8px', background: forma.boja_primarna || '#d4af37', color: '#0a0a0a', fontSize: '12px', fontWeight: 600 }}>Primarna</span>
                      <span style={{ padding: '8px 14px', borderRadius: '8px', background: forma.boja_akcent || '#f5e17a', color: '#0a0a0a', fontSize: '12px', fontWeight: 600 }}>Akcent</span>
                      <span style={{ padding: '8px 14px', borderRadius: '8px', color: forma.boja_font || '#f5f0e8', fontSize: '13px' }}>Primjer teksta</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={sacuvaj} disabled={cuvanje}
                    style={{
                      flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                      background: `linear-gradient(135deg,${gold},#b8960c)`, color: '#0a0a0a',
                      fontSize: '14px', fontWeight: 600, cursor: cuvanje ? 'wait' : 'pointer', opacity: cuvanje ? 0.7 : 1, fontFamily: 'sans-serif',
                    }}
                  >{cuvanje ? 'Čuvanje…' : 'Sačuvaj ✓'}</button>
                  {forma.id && (
                    <button onClick={() => obrisi(forma.id)}
                      style={{
                        padding: '14px 24px', borderRadius: '12px', border: '0.5px solid rgba(220,80,50,.4)',
                        background: 'rgba(220,80,50,.1)', color: '#e07a7a', fontSize: '14px', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'sans-serif',
                      }}
                    >Obriši</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:900px){
          div[style*="grid-template-columns: minmax(300px"]{grid-template-columns:1fr!important}
        }
        select option{background:#1a1a1a;color:#f5f0e8}
      `}</style>
    </div>
  )
}
