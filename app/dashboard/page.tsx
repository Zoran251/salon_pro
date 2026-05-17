'use client'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { waitForClientSession } from '@/lib/wait-client-session'
import { buildSalonSlug, fallbackSalonSlug } from '@/lib/slug'
import { getAppRole } from '@/lib/user-role'
import { getPublicSiteBase } from '@/lib/public-site-url'
import {
  GODISNJA_CIJENA_EUR,
  GODISNJA_CIJENA_SA_REF_EUR,
  PREPORUKE_ZA_POPUST,
  godisnjaCijenaZaBrojPreporuka,
} from '@/lib/salon-referral'
import type { Database } from '@/lib/supabase'
import {
  datumKljucBelgrad,
  formatDatumBelgrad,
  formatDateLabelBelgrade,
  formatVremeBelgrad,
} from '@/lib/termin-belgrade-vreme'
import { fileToUslugaSlikaDataUrl } from '@/lib/usluga-slika'

type SalonRow = Database['public']['Tables']['saloni']['Row']
type UslugaRow = Database['public']['Tables']['usluge']['Row']
type LagerRow = Database['public']['Tables']['lager']['Row']
type TerminRow = Database['public']['Tables']['termini']['Row'] & {
  usluge?: { naziv: string | null } | null
}
type CrnaListaRow = Database['public']['Tables']['kupci_crna_lista']['Row']
type LojalnostRow = Database['public']['Tables']['lojalnost']['Row']
type ZaposleniRow = Database['public']['Tables']['zaposleni']['Row']
type LojalnostForm = Pick<LojalnostRow, 'aktivan' | 'tip' | 'svaki_koji' | 'vrijednost'> &
  Partial<Pick<LojalnostRow, 'id' | 'salon_id' | 'created_at'>>
type UslugaLagerConsumption = {
  id: string
  usluga_id: string
  lager_id: string
  kolicina: number
  lager?: {
    naziv: string | null
    jedinica: string | null
  } | null
}
type NovaUslugaLagerItem = {
  lager_id: string
  kolicina: string
}
type SalonNotification = {
  id: string
  title: string
  body: string
  created_at: string
  appointment_id: string | null
  read_at: string | null
  tip?: string | null
}
type RashodRow = Database['public']['Tables']['rashodi']['Row']
type AnalitikaPeriod = 'danas' | 'sedmica' | 'mesec' | 'godina' | 'svi'
type TerminFilter = 'danas' | 'datum' | 'buduci' | 'prosli' | 'svi'
type ProfilForm = {
  naziv: string
  opis: string
  telefon: string
  adresa: string
  grad: string
  radno_od: string
  radno_do: string
  radni_dani_od: string
  radni_dani_do: string
  subota_od: string
  subota_do: string
  nedelja_od: string
  nedelja_do: string
  nedelja_zatvoreno: boolean
  logo: string
  boja_primarna: string
}
const defaultLojalnost: LojalnostForm = { aktivan: false, tip: 'popust', svaki_koji: 5, vrijednost: 20 }
type ProfilTextField = {
  label: string
  key: keyof Pick<ProfilForm, 'naziv' | 'telefon' | 'adresa' | 'grad'>
  placeholder: string
}

/** FK na saloni(id) — čest problem kad u bazi nema reda za auth.uid(). */
function formatSalonFkErrorMessage(message: string | undefined): string {
  if (!message) return 'Operacija nije uspjela.'
  const m = message.toLowerCase()
  if (m.includes('foreign key') && (m.includes('salon_id') || m.includes('saloni'))) {
    return (
      'U tabeli saloni nema reda čiji id odgovara vašem nalogu (usluge/lager/termini moraju biti vezani na salon). ' +
      'Dovršite registraciju (/registracija) ili u Supabase SQL Editor dodajte jedan red u public.saloni gdje je id = uuid vlasnika iz Authentication.'
    )
  }
  return message
}

/** Naziv usluge na terminu bez PostgREST embed-a (manje konflikata sa RLS / status kodovima). */
function terminiSaUslugaNazivom(termini: TerminRow[] | null, uslugeLista: UslugaRow[] | null): TerminRow[] {
  const map = new Map((uslugeLista || []).map((u: { id: string }) => [u.id, u]))
  return (termini || []).map((t) => ({
    ...t,
    usluge:
      t.usluga_id && map.has(t.usluga_id)
        ? { naziv: (map.get(t.usluga_id) as { naziv?: string | null }).naziv ?? null }
        : null,
  }))
}

function getLocalDateKey(value: Date | string): string {
  if (typeof value === 'string') return datumKljucBelgrad(value)
  return datumKljucBelgrad(value.toISOString())
}

function formatDateLabel(dateKey: string): string {
  return formatDateLabelBelgrade(dateKey)
}

function skratiNotifTekst(s: string, max = 220): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function formatSalonTipZaPrikaz(tip: string | null | undefined): string {
  if (!tip?.trim()) return '—'
  return tip
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' · ')
}

function klijentGrupacijaKljuc(t: TerminRow): string {
  const cid = t.client_id
  if (cid) return `c:${cid}`
  const tel = (t.telefon_klijenta || '').replace(/\D/g, '')
  return `t:${tel}|${(t.ime_klijenta || '').trim().toLowerCase()}`
}

const ANALITIKA_BEZ_ZAPOSLENOG = '__bez_zaposlenog__'

function prometTerminaUSalonu(t: TerminRow, uslugeMap: Map<string, UslugaRow>): number {
  if (!t.usluga_id) return 0
  const u = uslugeMap.get(t.usluga_id)
  return u ? Number(u.cijena) : 0
}

function employeeInitials(name: string | null | undefined): string {
  const parts = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
  return initials || 'SP'
}

const navItems = [
  { id: 'pregled', icon: '🏠', label: 'Pregled' },
  { id: 'analitika', icon: '📊', label: 'Analitika' },
  { id: 'profil', icon: '👤', label: 'Profil' },
  { id: 'usluge', icon: '💈', label: 'Usluge' },
  { id: 'zaposleni', icon: '✂️', label: 'Zaposleni' },
  { id: 'lager', icon: '📦', label: 'Lager' },
  { id: 'termini', icon: '📅', label: 'Termini' },
  { id: 'stranica', icon: '🔗', label: 'Moja stranica' },
  { id: 'lojalnost', icon: '🎁', label: 'Lojalnost' },
]

export default function Dashboard() {
  const router = useRouter()
  const [aktivan, setAktivan] = useState('pregled')
  const [ucitavanje, setUcitavanje] = useState(true)
  const [autentifikovan, setAutentifikovan] = useState(false)
  const [salon, setSalon] = useState<SalonRow | null>(null)
  const [usluge, setUsluge] = useState<UslugaRow[]>([])
  const [lager, setLager] = useState<LagerRow[]>([])
  const [termini, setTermini] = useState<TerminRow[]>([])
  const [salonNotifications, setSalonNotifications] = useState<SalonNotification[]>([])
  const [notifMenuOpen, setNotifMenuOpen] = useState(false)
  const [notifStarijeOtvoreno, setNotifStarijeOtvoreno] = useState(false)
  const notifMenuRef = useRef<HTMLDivElement>(null)
  const [crnaLista, setCrnaLista] = useState<CrnaListaRow[]>([])
  const [crnaRučnoTelefon, setCrnaRučnoTelefon] = useState('')
  const [crnaRučnoIme, setCrnaRučnoIme] = useState('')
  const [crnaRučnoLoading, setCrnaRučnoLoading] = useState(false)
  const [crnaRučnoGreska, setCrnaRučnoGreska] = useState('')
  const [lojalnost, setLojalnost] = useState<LojalnostForm>(defaultLojalnost)
  const [resolvedSlug, setResolvedSlug] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrSvg, setQrSvg] = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState('')
  // ...ostatak state-a ostaje isti...
  const [novaUsluga, setNovaUsluga] = useState({ naziv: '', cijena: '', trajanje: '', opis: '', slika_url: '' })
  /** Dva skrivena inputa: nova usluga (uvek cilj „nova”) i postojeća (cilj = id pre klika). */
  const uslugaSlikaNovaInputRef = useRef<HTMLInputElement>(null)
  const uslugaSlikaPostojecaInputRef = useRef<HTMLInputElement>(null)
  const uslugaSlikaPostojecaCiljRef = useRef<string | null>(null)
  const [uslugaSlikaBusyId, setUslugaSlikaBusyId] = useState<string | null>(null)
  const [novaUslugaLager, setNovaUslugaLager] = useState<NovaUslugaLagerItem[]>([])
  const [uslugaLager, setUslugaLager] = useState<UslugaLagerConsumption[]>([])
  const [noviLager, setNoviLager] = useState({ naziv: '', kategorija: '', kolicina: '', minimum: '', jedinica: 'kom' })
  const [showNovaUsluga, setShowNovaUsluga] = useState(false)
  const [showNoviLager, setShowNoviLager] = useState(false)
  const [uslugaGreska, setUslugaGreska] = useState('')
  const [uslugaLoading, setUslugaLoading] = useState(false)
  const [lagerGreska, setLagerGreska] = useState('')
  /** Prijem zalihe za već postojeći artikal (ne novi red u tabeli). */
  const [lagerPrijem, setLagerPrijem] = useState<{ lagerId: string | null; kolicina: string }>({
    lagerId: null,
    kolicina: '',
  })
  const [lagerPrijemGreska, setLagerPrijemGreska] = useState('')
  const [lagerPrijemLoading, setLagerPrijemLoading] = useState(false)
  const [terminiPotvrdaGreska, setTerminiPotvrdaGreska] = useState('')
  const [terminFilter, setTerminFilter] = useState<TerminFilter>('danas')
  const [izabraniDatum, setIzabraniDatum] = useState(() => getLocalDateKey(new Date()))
  const [rashodi, setRashodi] = useState<RashodRow[]>([])
  const [analitikaPeriod, setAnalitikaPeriod] = useState<AnalitikaPeriod>('mesec')
  const [preporuceneSalone, setPreporuceneSalone] = useState<{ naziv: string; created_at: string | null }[]>([])
  const [referalKopiran, setReferalKopiran] = useState(false)
  const [analitikaZaposleniDetaljKljuc, setAnalitikaZaposleniDetaljKljuc] = useState<string | null>(null)
  const [analitikaKlijentDetaljKljuc, setAnalitikaKlijentDetaljKljuc] = useState<string | null>(null)
  const [showNoviRashod, setShowNoviRashod] = useState(false)
  const [noviRashod, setNoviRashod] = useState({ naziv: '', iznos: '', kategorija: 'Ostalo', datum: getLocalDateKey(new Date()), napomena: '' })
  const [rashodGreska, setRashodGreska] = useState('')
  const [sauvano, setSacuvano] = useState('')
  const [profil, setProfil] = useState<ProfilForm>({
    naziv: '', opis: '', telefon: '', adresa: '', grad: '',
    radno_od: '', radno_do: '', radni_dani_od: '', radni_dani_do: '',
    subota_od: '', subota_do: '', nedelja_od: '', nedelja_do: '', nedelja_zatvoreno: false,
    logo: '', boja_primarna: '#d4af37'
  })
  const [zaposleni, setZaposleni] = useState<ZaposleniRow[]>([])
  const [noviZaposleni, setNoviZaposleni] = useState({ ime: '', uloga: '', foto_url: '' })
  const [showNoviZaposleni, setShowNoviZaposleni] = useState(false)
  const [zaposleniGreska, setZaposleniGreska] = useState('')

  const gold = '#d4af37'
  const goldFaint = 'rgba(212,175,55,.12)'
  const goldBorder = 'rgba(212,175,55,.25)'
  const muted = 'rgba(245,240,232,.45)'
  const text = '#f5f0e8'
  const todayKey = getLocalDateKey(new Date())
  const nowTime = Date.now()
  const danasnjiTermini = termini.filter((t) => getLocalDateKey(t.datum_vrijeme) === todayKey)
  const terminiZaIzabraniDatum = termini.filter((t) => getLocalDateKey(t.datum_vrijeme) === izabraniDatum)
  const buduciTermini = termini.filter(
    (t) => new Date(t.datum_vrijeme).getTime() >= nowTime && t.status !== 'otkazan' && t.status !== 'nije_dosao',
  )
  const prosliTermini = termini.filter((t) => new Date(t.datum_vrijeme).getTime() < nowTime)
  const filtriraniTermini =
    terminFilter === 'danas'
      ? danasnjiTermini
      : terminFilter === 'datum'
      ? terminiZaIzabraniDatum
      : terminFilter === 'buduci'
        ? buduciTermini
        : terminFilter === 'prosli'
          ? prosliTermini
          : termini
  const terminFilterLabel =
    terminFilter === 'danas'
      ? `Danas - ${formatDateLabel(todayKey)}`
      : terminFilter === 'datum'
        ? formatDateLabel(izabraniDatum)
        : terminFilter === 'buduci'
          ? 'Budući termini'
          : terminFilter === 'prosli'
            ? 'Prošli termini'
            : 'Svi termini'
  const kupacIzmijenioPotvrdjen = termini.filter(
    (t) => t.status === 'potvrđen' && Boolean((t as { last_updated_by_client?: boolean }).last_updated_by_client),
  ).length
  const neprocitaniTermini =
    termini.filter((t) => t.status !== 'potvrđen' && t.status !== 'otkazan').length + kupacIzmijenioPotvrdjen

  const NAJNOVIJE_SALON_NOTIF = 3
  const najnovijeSalonNotifikacije = useMemo(
    () => salonNotifications.slice(0, NAJNOVIJE_SALON_NOTIF),
    [salonNotifications],
  )
  const starijeSalonNotifikacije = useMemo(
    () => salonNotifications.slice(NAJNOVIJE_SALON_NOTIF),
    [salonNotifications],
  )
  const obavestenjaVidljivaUMeniju = useMemo(
    () => (notifStarijeOtvoreno ? salonNotifications : najnovijeSalonNotifikacije),
    [notifStarijeOtvoreno, salonNotifications, najnovijeSalonNotifikacije],
  )
  const zvonacBroj = Math.max(neprocitaniTermini, salonNotifications.length)

  useEffect(() => {
    setAnalitikaZaposleniDetaljKljuc(null)
    setAnalitikaKlijentDetaljKljuc(null)
  }, [analitikaPeriod])

  useEffect(() => {
    if (!analitikaKlijentDetaljKljuc) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAnalitikaKlijentDetaljKljuc(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [analitikaKlijentDetaljKljuc])

  useEffect(() => {
    if (!notifMenuOpen) return
    const close = (e: MouseEvent) => {
      const el = notifMenuRef.current
      if (el && !el.contains(e.target as Node)) setNotifMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [notifMenuOpen])

  useEffect(() => {
    if (!notifMenuOpen) setNotifStarijeOtvoreno(false)
  }, [notifMenuOpen])

  // getSession() pri prvom renderu često vrati null dok Supabase ne učita sesiju iz localStorage.
  // onAuthStateChange + kratki retry sprječavaju lažni redirect na /login nakon uspješne prijave.
  useEffect(() => {
    let cancelled = false
    let loaded = false

    const loadDashboard = async (userId: string) => {
      if (cancelled || loaded) return
      loaded = true
      setAutentifikovan(true)
      await ucitajPodatke(userId)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'SIGNED_OUT') {
        loaded = false
        setAutentifikovan(false)
        router.push('/login')
        return
      }
      if (
        session?.user &&
        (event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED')
      ) {
        void loadDashboard(session.user.id)
      }
    })

    ;(async () => {
      try {
        const session = await waitForClientSession()
        if (cancelled || loaded) return
        if (session?.user) {
          await loadDashboard(session.user.id)
        } else {
          router.push('/login')
        }
      } catch (err) {
        console.error('Greška pri proveri autentifikacije:', err)
        if (!cancelled) router.push('/login')
      }
    })()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jednokratan auth bootstrap; ucitajPodatke je definisan ispod i ne sme u dependency
  }, [router])

  const ucitajPodatke = async (userId: string) => {
    try {
      setUcitavanje(true)

      // Učitaj salon podatke
      const { data: salonData, error: salonError } = await supabase
        .from('saloni')
        .select('*')
        .eq('id', userId)
        .single()

      if (salonError || !salonData) {
        console.error('Salon nije pronađen:', salonError)
        const { data: userData } = await supabase.auth.getUser()
        const role = getAppRole(userData.user)
        if (role === 'customer') {
          router.replace('/')
          return
        }
        router.push('/registracija')
        return
      }

      let workingSlug = buildSalonSlug(salonData.slug || '')
      if (!workingSlug) {
        const landingPage = typeof salonData.landing_page === 'string' ? salonData.landing_page : ''
        const pathSlug = landingPage.split('/salon/')[1]?.split('?')[0] || ''
        workingSlug = buildSalonSlug(pathSlug) || fallbackSalonSlug(salonData.naziv || userId)

        const { error: slugUpdateError } = await supabase
          .from('saloni')
          .update({ slug: workingSlug })
          .eq('id', userId)

        if (slugUpdateError) {
          console.error('Greška pri automatskom popravku sluga:', slugUpdateError)
        } else {
          console.log('Slug automatski popravljen:', workingSlug)
        }
      }

      console.log('Salon učitan:', salonData.naziv)
      setResolvedSlug(workingSlug)
      setSalon(salonData)
      setProfil({
        naziv: salonData.naziv || '',
        opis: salonData.opis || '',
        telefon: salonData.telefon || '',
        adresa: salonData.adresa || '',
        grad: salonData.grad || '',
        radno_od: salonData.radno_od || '',
        radno_do: salonData.radno_do || '',
        radni_dani_od: salonData.radni_dani_od || salonData.radno_od || '',
        radni_dani_do: salonData.radni_dani_do || salonData.radno_do || '',
        subota_od: salonData.subota_od || '',
        subota_do: salonData.subota_do || '',
        nedelja_od: salonData.nedelja_od || '',
        nedelja_do: salonData.nedelja_do || '',
        nedelja_zatvoreno: Boolean(salonData.nedelja_zatvoreno),
        logo: salonData.logo_url || '',
        boja_primarna: salonData.boja_primarna || '#d4af37'
      })

      // Učitaj usluge
      const { data: uslugeData, error: uslugeErr } = await supabase
        .from('usluge')
        .select('*')
        .eq('salon_id', userId)
        .order('created_at', { ascending: true })

      if (uslugeErr) {
        console.error('[dashboard] Usluge:', uslugeErr.message, uslugeErr)
      }
      setUsluge(uslugeData || [])

      const { data: zaposleniData, error: zaposleniErr } = await supabase
        .from('zaposleni')
        .select('*')
        .eq('salon_id', userId)
        .order('created_at', { ascending: true })

      if (zaposleniErr) {
        const missingTable = /relation .*zaposleni.* does not exist|schema cache/i.test(zaposleniErr.message)
        if (missingTable) {
          console.warn('[dashboard] Pokreni migraciju 2026-05-13_salon_hours_staff_booking.sql za zaposlene.')
        } else {
          console.error('[dashboard] Zaposleni:', zaposleniErr.message, zaposleniErr)
        }
        setZaposleni([])
      } else {
        setZaposleni(zaposleniData || [])
      }

      // Učitaj lager
      const { data: lagerData, error: lagerErr } = await supabase
        .from('lager')
        .select('*')
        .eq('salon_id', userId)
        .order('created_at', { ascending: true })

      if (lagerErr) {
        console.error('[dashboard] Lager:', lagerErr.message, lagerErr)
      }
      setLager(lagerData || [])

      const { data: potrosnjaData, error: potrosnjaErr } = await supabase
        .from('usluga_lager_potrosnja')
        .select('id, usluga_id, lager_id, kolicina')
        .eq('salon_id', userId)
        .order('created_at', { ascending: true })

      if (potrosnjaErr) {
        const missingTable = /relation .*usluga_lager_potrosnja.* does not exist/i.test(potrosnjaErr.message)
        if (missingTable) {
          console.warn('[dashboard] Pokreni migraciju 2026-05-07_service_lager_consumption.sql za povezivanje usluga i lagera.')
        } else {
          console.error('[dashboard] Potrošnja lagera:', potrosnjaErr.message, potrosnjaErr)
        }
      }
      const lagerMap = new Map((lagerData || []).map((l) => [l.id, l]))
      setUslugaLager(
        (potrosnjaData || []).map((p) => {
          const item = lagerMap.get(p.lager_id)
          return {
            id: p.id,
            usluga_id: p.usluga_id,
            lager_id: p.lager_id,
            kolicina: p.kolicina,
            lager: item ? { naziv: item.naziv, jedinica: item.jedinica } : null,
          }
        }),
      )

      // Učitaj termine (bez embed usluge — spajamo u memoriji posle učitanih usluga)
      const { data: terminiData, error: terminiErr } = await supabase
        .from('termini')
        .select('*')
        .eq('salon_id', userId)
        .order('datum_vrijeme', { ascending: true })

      if (terminiErr) {
        console.error('[dashboard] Termini:', terminiErr.message, terminiErr)
      }
      setTermini(terminiSaUslugaNazivom(terminiData, uslugeData || []))

      const { data: crnaListaData, error: crnaListaErr } = await supabase
        .from('kupci_crna_lista')
        .select('*, saloni ( naziv )')
        .order('created_at', { ascending: false })
      if (!crnaListaErr) setCrnaLista(crnaListaData || [])

      const { data: salonNotifData, error: salonNotifErr } = await supabase
        .from('salon_notifications')
        .select('id, title, body, created_at, appointment_id, read_at, tip')
        .eq('salon_id', userId)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (salonNotifErr) {
        const missingTable = /relation .*salon_notifications.* does not exist/i.test(salonNotifErr.message)
        if (!missingTable) console.error('[dashboard] Obaveštenja salona:', salonNotifErr.message, salonNotifErr)
      } else {
        setSalonNotifications((salonNotifData || []) as SalonNotification[])
      }

      const { data: rashodiData, error: rashodiErr } = await supabase
        .from('rashodi')
        .select('*')
        .eq('salon_id', userId)
        .order('datum', { ascending: false })
      if (rashodiErr) {
        const missingTable = /relation .*rashodi.* does not exist/i.test(rashodiErr.message)
        if (!missingTable) console.error('[dashboard] Rashodi:', rashodiErr.message)
      }
      setRashodi(rashodiData || [])

      const { data: prefData, error: prefErr } = await supabase
        .from('saloni')
        .select('naziv, created_at')
        .eq('preporucio_salon_id', userId)
        .order('created_at', { ascending: true })
      if (prefErr) {
        const missingCol = /preporucio_salon_id|column .* does not exist|schema cache/i.test(prefErr.message)
        if (!missingCol) console.error('[dashboard] Preporuke salona:', prefErr.message)
        setPreporuceneSalone([])
      } else {
        setPreporuceneSalone(prefData || [])
      }

      const { data: lojalnostData } = await supabase
        .from('lojalnost')
        .select('*')
        .eq('salon_id', userId)
        .single()

      setLojalnost(lojalnostData || defaultLojalnost)

      console.log('Svi podaci su uspešno učitani')
    } catch (err) {
      console.error('Greška pri učitavanju podataka:', err)
    } finally {
      setUcitavanje(false)
    }
  }

  const oznaciSalonNotifikacijuProcitanom = async (notifId: string) => {
    const sid = salon?.id
    if (!sid) return
    const readAt = new Date().toISOString()
    const { error } = await supabase
      .from('salon_notifications')
      .update({ read_at: readAt })
      .eq('id', notifId)
      .eq('salon_id', sid)
    if (error) {
      console.error('[dashboard] Označavanje obaveštenja:', error.message)
      return
    }
    setSalonNotifications((prev) => prev.filter((n) => n.id !== notifId))
  }

  useEffect(() => {
    if (!resolvedSlug || typeof window === 'undefined') {
      setQrDataUrl('')
      setQrSvg('')
      setQrError('')
      setQrLoading(false)
      return
    }
    let cancelled = false
    setQrLoading(true)
    setQrError('')
    const fullUrl = `${getPublicSiteBase()}/salon/${resolvedSlug}`

    ;(async () => {
      try {
        const QR = (await import('qrcode')).default
        const [png, svg] = await Promise.all([
          QR.toDataURL(fullUrl, {
            width: 240,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#0a0a0a', light: '#ffffff' },
          }),
          QR.toString(fullUrl, {
            type: 'svg',
            margin: 2,
            color: { dark: '#0a0a0a', light: '#ffffff' },
          }),
        ])
        if (!cancelled) {
          setQrDataUrl(png)
          setQrSvg(svg)
        }
      } catch (e) {
        if (!cancelled) {
          setQrError(e instanceof Error ? e.message : 'QR kod se nije mogao generisati.')
          setQrDataUrl('')
          setQrSvg('')
        }
      } finally {
        if (!cancelled) setQrLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [resolvedSlug])

  const preuzmiQrPng = () => {
    if (!qrDataUrl || !resolvedSlug) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `salon-${resolvedSlug}-qr.png`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const preuzmiQrSvg = () => {
    if (!qrSvg || !resolvedSlug) return
    const blob = new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' })
    const u = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = u
    a.download = `salon-${resolvedSlug}-qr.svg`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(u)
  }

  const sacuvajProfil = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (!user || userError) {
        console.error('Greška pri dohvatanju korisnika')
        return
      }

      const radniDaniOd = profil.radni_dani_od.trim() || null
      const radniDaniDo = profil.radni_dani_do.trim() || null
      const subotaOd = profil.subota_od.trim() || null
      const subotaDo = profil.subota_do.trim() || null
      const nedeljaOd = profil.nedelja_zatvoreno ? null : profil.nedelja_od.trim() || null
      const nedeljaDo = profil.nedelja_zatvoreno ? null : profil.nedelja_do.trim() || null
      const updateData = {
        naziv: profil.naziv,
        opis: profil.opis,
        telefon: profil.telefon,
        adresa: profil.adresa,
        grad: profil.grad,
        radno_od: radniDaniOd,
        radno_do: radniDaniDo,
        radni_dani_od: radniDaniOd,
        radni_dani_do: radniDaniDo,
        subota_od: subotaOd,
        subota_do: subotaDo,
        nedelja_od: nedeljaOd,
        nedelja_do: nedeljaDo,
        nedelja_zatvoreno: profil.nedelja_zatvoreno,
        logo_url: profil.logo,
        boja_primarna: profil.boja_primarna,
      }

      const { error } = await supabase
        .from('saloni')
        .update(updateData)
        .eq('id', user.id)

      if (!error) {
        setSacuvano('profil')
        setTimeout(() => setSacuvano(''), 3000)
        console.log('Profil sačuvan!')
      } else {
        console.error('Greška pri čuvanju:', error)
      }
    } catch (err) {
      console.error('Catch error:', err)
    }
  }

  // ...ostatak funkcija ostaje isti (dodajUslugu, obrisiUslugu, itd.)...
  
  const dodajUslugu = async () => {
    const naziv = novaUsluga.naziv.trim()
    const cijena = parseFloat(novaUsluga.cijena.replace(',', '.'))
    const trajanje = parseInt(novaUsluga.trajanje, 10) || 30
    const potrosnja = novaUslugaLager
      .map((item) => ({
        lager_id: item.lager_id,
        kolicina: parseFloat(item.kolicina.replace(',', '.')),
      }))
      .filter((item) => item.lager_id && !Number.isNaN(item.kolicina) && item.kolicina > 0)

    if (!naziv || Number.isNaN(cijena) || cijena <= 0) {
      setUslugaGreska('Unesite naziv i ispravnu cenu.')
      return
    }
    if (novaUslugaLager.length !== potrosnja.length) {
      setUslugaGreska('Za svaku stavku lagera izaberite artikal i unesite količinu veću od nule.')
      return
    }
    if (new Set(potrosnja.map((item) => item.lager_id)).size !== potrosnja.length) {
      setUslugaGreska('Isti artikal iz lagera dodajte samo jednom po usluzi.')
      return
    }

    setUslugaGreska('')
    setUslugaLoading(true)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setUslugaGreska('Sesija je istekla. Prijavi se ponovo.')
        return
      }

      if (!salon?.id) {
        setUslugaGreska('Salon nije učitan. Osvežite stranicu ili se ponovo prijavite.')
        return
      }

      const { data, error } = await supabase.from('usluge').insert({
        salon_id: salon.id,
        naziv,
        cijena,
        trajanje,
        opis: novaUsluga.opis.trim(),
        aktivan: true,
        slika_url: novaUsluga.slika_url?.trim() || null,
      }).select().single()

      if (error || !data) {
        setUslugaGreska(formatSalonFkErrorMessage(error?.message) || 'Dodavanje usluge nije uspelo.')
        return
      }

      let novaPotrosnja: UslugaLagerConsumption[] = []
      if (potrosnja.length > 0) {
        const { data: potrosnjaRows, error: potrosnjaError } = await supabase
          .from('usluga_lager_potrosnja')
          .insert(
            potrosnja.map((item) => ({
              salon_id: salon.id,
              usluga_id: data.id,
              lager_id: item.lager_id,
              kolicina: item.kolicina,
            })),
          )
          .select('id, usluga_id, lager_id, kolicina')

        if (potrosnjaError) {
          setUslugaGreska(
            /relation .*usluga_lager_potrosnja.* does not exist/i.test(potrosnjaError.message)
              ? 'U Supabase pokrenite migraciju 2026-05-07_service_lager_consumption.sql, pa pokušajte ponovo.'
              : potrosnjaError.message,
          )
          await supabase.from('usluge').delete().eq('id', data.id)
          return
        }
        novaPotrosnja = (potrosnjaRows || []).map((row) => {
          const lagerRow = lager.find((l) => l.id === row.lager_id)
          return {
            ...row,
            lager: lagerRow ? { naziv: lagerRow.naziv, jedinica: lagerRow.jedinica } : null,
          }
        }) as UslugaLagerConsumption[]
      }

      setUsluge((prev) => [...prev, data])
      setUslugaLager((prev) => [...prev, ...novaPotrosnja])
      setNovaUsluga({ naziv: '', cijena: '', trajanje: '', opis: '', slika_url: '' })
      setNovaUslugaLager([])
      setShowNovaUsluga(false)
    } catch {
      setUslugaGreska('Došlo je do greške. Pokušajte ponovo.')
    } finally {
      setUslugaLoading(false)
    }
  }

  const obrisiUslugu = async (id: string) => {
    await supabase.from('usluge').delete().eq('id', id)
    setUsluge(usluge.filter(u => u.id !== id))
    setUslugaLager((prev) => prev.filter((p) => p.usluga_id !== id))
  }

  const otvoriUslugaSlikuPickerNova = () => {
    uslugaSlikaNovaInputRef.current?.click()
  }

  const otvoriUslugaSlikuPickerPostojeca = (uslugaId: string) => {
    uslugaSlikaPostojecaCiljRef.current = uslugaId
    uslugaSlikaPostojecaInputRef.current?.click()
  }

  const handleUslugaSlikaFajlNova = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUslugaGreska('')
    try {
      const dataUrl = await fileToUslugaSlikaDataUrl(file)
      setNovaUsluga((prev) => ({ ...prev, slika_url: dataUrl }))
    } catch (err) {
      setUslugaGreska(err instanceof Error ? err.message : 'Slika nije učitana.')
    }
  }

  const handleUslugaSlikaFajlPostojeca = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cilj = uslugaSlikaPostojecaCiljRef.current
    uslugaSlikaPostojecaCiljRef.current = null
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !cilj) return
    setUslugaGreska('')
    setUslugaSlikaBusyId(cilj)
    try {
      const dataUrl = await fileToUslugaSlikaDataUrl(file)
      const { data: updatedRows, error } = await supabase
        .from('usluge')
        .update({ slika_url: dataUrl })
        .eq('id', cilj)
        .select('id, slika_url')
      if (error) {
        const msg = /slika_url|column .* does not exist|schema cache/i.test(error.message)
          ? 'U Supabase pokrenite migracije 2026-05-21_usluge_slika_url.sql ili 2026-05-22_usluge_slika_url_ensure.sql, pa pokušajte ponovo.'
          : error.message
        setUslugaGreska(msg)
        return
      }
      const updated = updatedRows?.[0]
      if (!updated) {
        setUslugaGreska(
          'Slika nije sačuvana (baza nije vratila ažuriran red). Proverite da li ste prijavljeni kao vlasnik ovog salona, osvežite stranicu, pa u Supabase proverite migraciju za kolonu slika_url.',
        )
        return
      }
      setUsluge((prev) => prev.map((u) => (u.id === cilj ? { ...u, slika_url: updated.slika_url } : u)))
    } catch (err) {
      setUslugaGreska(err instanceof Error ? err.message : 'Slika nije učitana.')
    } finally {
      setUslugaSlikaBusyId(null)
    }
  }

  const ukloniSlikuUsluge = async (id: string) => {
    setUslugaGreska('')
    setUslugaSlikaBusyId(id)
    try {
      const { data: clearedRows, error } = await supabase
        .from('usluge')
        .update({ slika_url: null })
        .eq('id', id)
        .select('id, slika_url')
      if (error) {
        const msg = /slika_url|column .* does not exist|schema cache/i.test(error.message)
          ? 'U Supabase pokrenite migracije 2026-05-21_usluge_slika_url.sql ili 2026-05-22_usluge_slika_url_ensure.sql, pa pokušajte ponovo.'
          : error.message
        setUslugaGreska(msg)
        return
      }
      if (!clearedRows?.[0]) {
        setUslugaGreska('Uklanjanje slike nije uspelo. Osvežite stranicu i pokušajte ponovo.')
        return
      }
      setUsluge((prev) => prev.map((u) => (u.id === id ? { ...u, slika_url: null } : u)))
    } finally {
      setUslugaSlikaBusyId(null)
    }
  }

  const dodajZaposlenog = async () => {
    const ime = noviZaposleni.ime.trim()
    const uloga = noviZaposleni.uloga.trim()
    setZaposleniGreska('')
    if (!ime) {
      setZaposleniGreska('Unesite ime zaposlenog.')
      return
    }
    if (!salon?.id) {
      setZaposleniGreska('Salon nije učitan. Osvežite stranicu.')
      return
    }
    const { data, error } = await supabase
      .from('zaposleni')
      .insert({ salon_id: salon.id, ime, uloga: uloga || null, foto_url: noviZaposleni.foto_url || null, aktivan: true })
      .select()
      .single()
    if (error) {
      setZaposleniGreska(
        /zaposleni|schema cache|does not exist/i.test(error.message)
          ? 'U Supabase pokrenite migraciju 2026-05-13_salon_hours_staff_booking.sql, pa pokušajte ponovo.'
          : error.message,
      )
      return
    }
    setZaposleni((prev) => [...prev, data])
    setNoviZaposleni({ ime: '', uloga: '', foto_url: '' })
    setShowNoviZaposleni(false)
  }

  const podesiAktivnostZaposlenog = async (id: string, aktivan: boolean) => {
    const { error } = await supabase.from('zaposleni').update({ aktivan }).eq('id', id)
    if (error) {
      setZaposleniGreska(error.message)
      return
    }
    setZaposleni((prev) => prev.map((z) => (z.id === id ? { ...z, aktivan } : z)))
  }

  const obrisiZaposlenog = async (id: string) => {
    const { error } = await supabase.from('zaposleni').delete().eq('id', id)
    if (error) {
      setZaposleniGreska(error.message)
      return
    }
    setZaposleni((prev) => prev.filter((z) => z.id !== id))
  }

  const dodajLager = async () => {
    if (!noviLager.naziv || !noviLager.kolicina) return
    setLagerGreska('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (!salon?.id) {
      setLagerGreska('Salon nije učitan. Osvežite stranicu.')
      return
    }
    const kol = parseInt(noviLager.kolicina)
    const min = parseInt(noviLager.minimum) || 0
    const { data, error } = await supabase.from('lager').insert({
      salon_id: salon.id,
      naziv: noviLager.naziv,
      kategorija: noviLager.kategorija || 'Ostalo',
      kolicina: kol,
      minimum: min,
      jedinica: noviLager.jedinica
    }).select().single()
    if (error) {
      setLagerGreska(formatSalonFkErrorMessage(error.message))
      return
    }
    if (data) {
      setLager([...lager, data])
      setNoviLager({ naziv: '', kategorija: '', kolicina: '', minimum: '', jedinica: 'kom' })
      setShowNoviLager(false)
    }
  }

  const potvrdiPrijemZalihe = async () => {
    const id = lagerPrijem.lagerId
    if (!id) return
    const sid = salon?.id
    if (!sid) {
      setLagerPrijemGreska('Salon nije učitan. Osvežite stranicu.')
      return
    }
    const dodatak = parseInt(lagerPrijem.kolicina, 10)
    if (!Number.isFinite(dodatak) || dodatak <= 0 || dodatak > 1_000_000) {
      setLagerPrijemGreska('Unesite celu pozitivnu količinu koju dodajete na zalihu (npr. 5).')
      return
    }
    const row = lager.find((x) => x.id === id)
    if (!row) return
    setLagerPrijemGreska('')
    setLagerPrijemLoading(true)
    const nova = Number(row.kolicina) + dodatak
    const { data, error } = await supabase
      .from('lager')
      .update({ kolicina: nova })
      .eq('id', id)
      .eq('salon_id', sid)
      .select()
      .single()
    setLagerPrijemLoading(false)
    if (error) {
      setLagerPrijemGreska(formatSalonFkErrorMessage(error.message))
      return
    }
    if (data) {
      setLager((prev) => prev.map((x) => (x.id === id ? { ...x, kolicina: data.kolicina } : x)))
      setLagerPrijem({ lagerId: null, kolicina: '' })
      setLagerPrijemGreska('')
    }
  }

  const obrisiLager = async (id: string) => {
    if (lagerPrijem.lagerId === id) {
      setLagerPrijem({ lagerId: null, kolicina: '' })
      setLagerPrijemGreska('')
    }
    await supabase.from('lager').delete().eq('id', id)
    setLager(lager.filter(l => l.id !== id))
  }

  const potvrdiTermin = async (id: string) => {
    setTerminiPotvrdaGreska('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      setTerminiPotvrdaGreska('Sesija je istekla. Prijavi se ponovo.')
      return
    }
    const sid = salon?.id ?? user.id
    const { error } = await supabase
      .from('termini')
      .update({ status: 'potvrđen' })
      .eq('id', id)
      .eq('salon_id', sid)
    if (error) {
      setTerminiPotvrdaGreska(formatSalonFkErrorMessage(error.message))
      return
    }
    const { data: sessionData } = await supabase.auth.getSession()
    const accessTok = sessionData.session?.access_token
    if (accessTok) {
      void fetch('/api/salon/notify-customer-termin-potvrden', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessTok}`,
        },
        body: JSON.stringify({ termin_id: id }),
      }).catch(() => {})
    }
    const { data: refreshed, error: refErr } = await supabase
      .from('termini')
      .select('*')
      .eq('salon_id', sid)
      .order('datum_vrijeme', { ascending: true })
    const { data: refreshedLager } = await supabase
      .from('lager')
      .select('*')
      .eq('salon_id', sid)
      .order('created_at', { ascending: true })
    if (refErr) {
      setTermini(terminiSaUslugaNazivom(termini.map((t) => (t.id === id ? { ...t, status: 'potvrđen' } : t)), usluge))
      if (refreshedLager) setLager(refreshedLager)
      return
    }
    if (refreshed) setTermini(terminiSaUslugaNazivom(refreshed, usluge))
    if (refreshedLager) setLager(refreshedLager)
  }

  const oznaciDaNijeDosao = async (id: string) => {
    setTerminiPotvrdaGreska('')
    if (!window.confirm('Označiti da se kupac nije pojavio? Nalog kupca biće stavljen na crnu listu.')) return
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setTerminiPotvrdaGreska('Sesija je istekla. Prijavi se ponovo.')
      return
    }
    const res = await fetch(`/api/appointments/${id}/no-show`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const data = (await res.json()) as { error?: string }
    if (!res.ok || data.error) {
      setTerminiPotvrdaGreska(data.error || 'Označavanje nedolaska nije uspelo.')
      return
    }
    const sid = salon?.id ?? session.user.id
    const { data: refreshed } = await supabase
      .from('termini')
      .select('*')
      .eq('salon_id', sid)
      .order('datum_vrijeme', { ascending: true })
    if (refreshed) setTermini(terminiSaUslugaNazivom(refreshed, usluge))
    await osveziCrnuListu()
  }

  const sacuvajLojalnost = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = {
      aktivan: lojalnost.aktivan,
      tip: lojalnost.tip,
      svaki_koji: lojalnost.svaki_koji,
      vrijednost: lojalnost.vrijednost,
    }
    const { data: existing } = await supabase.from('lojalnost').select('id').eq('salon_id', user.id).single()
    if (existing) {
      await supabase.from('lojalnost').update(payload).eq('salon_id', user.id)
    } else {
      await supabase.from('lojalnost').insert({ ...payload, salon_id: user.id })
    }
    setSacuvano('lojalnost')
    setTimeout(() => setSacuvano(''), 3000)
  }

  const osveziCrnuListu = async () => {
    const { data, error } = await supabase
      .from('kupci_crna_lista')
      .select('*, saloni ( naziv )')
      .order('created_at', { ascending: false })
    if (!error && data) setCrnaLista(data)
  }

  const dodajNaCrnuListu = async () => {
    setCrnaRučnoGreska('')
    const tel = crnaRučnoTelefon.trim()
    if (!tel) {
      setCrnaRučnoGreska('Unesite broj telefona.')
      return
    }
    setCrnaRučnoLoading(true)
    try {
      const { data, error } = await supabase.rpc('salon_dodaj_kupca_u_crnu_listu', {
        p_telefon: tel,
        p_ime: crnaRučnoIme.trim() || null,
      })
      if (error) {
        setCrnaRučnoGreska(error.message)
        return
      }
      const r = data as { ok?: boolean; error?: string } | null
      if (r && r.ok === false) {
        setCrnaRučnoGreska(r.error || 'Dodavanje nije uspelo.')
        return
      }
      setCrnaRučnoTelefon('')
      setCrnaRučnoIme('')
      await osveziCrnuListu()
    } finally {
      setCrnaRučnoLoading(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) { alert('Fajl je prevelik! Maksimalno 2MB.'); return }
      const reader = new FileReader()
      reader.onload = ev => setProfil({ ...profil, logo: ev.target?.result as string })
      reader.readAsDataURL(file)
    }
  }

  const handleZaposleniFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setZaposleniGreska('Fotografija je prevelika. Maksimalno 2MB.')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      setNoviZaposleni((prev) => ({ ...prev, foto_url: String(ev.target?.result || '') }))
      setZaposleniGreska('')
    }
    reader.readAsDataURL(file)
  }

  const handleOdjava = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Stiilo definicije
  const inputStyle: React.CSSProperties = {
    outline: 'none', width: '100%', fontSize: '14px', background: '#1a1a1a',
    border: `0.5px solid ${goldBorder}`, color: text, padding: '12px 14px',
    borderRadius: '10px', fontFamily: 'sans-serif'
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', color: muted, display: 'block', marginBottom: '5px', letterSpacing: '.3px'
  }
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

  const renderEmployeeAvatar = (z: Pick<ZaposleniRow, 'ime' | 'foto_url'>, size = 46) => (
    z.foto_url ? (
      // eslint-disable-next-line @next/next/no-img-element -- spoljni URL zaposlenog; Image zahteva konfiguraciju domena
      <img
        src={z.foto_url}
        alt={z.ime}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${goldBorder}`, flexShrink: 0 }}
      />
    ) : (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg,${goldFaint},rgba(212,175,55,.04))`,
          border: `1px solid ${goldBorder}`,
          color: gold,
          fontSize: Math.max(12, Math.round(size * 0.32)),
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        {employeeInitials(z.ime)}
      </div>
    )
  )

  // Render funkcije ostaju identične...
  const renderPregled = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '12px' }}>
        {[
          { label: 'Termini danas', value: danasnjiTermini.length.toString(), icon: '📅' },
          { label: 'Budući termini', value: buduciTermini.length.toString(), icon: '⏭️' },
          { label: 'Prošli termini', value: prosliTermini.length.toString(), icon: '↩️' },
          { label: 'Ukupno termina', value: termini.length.toString(), icon: '📋' },
        ].map((s, i) => (
          <div key={i} style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: gold, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: text, marginBottom: '4px' }}>Današnji termini</h3>
            <p style={{ fontSize: '12px', color: muted }}>{formatDateLabel(todayKey)}</p>
          </div>
          <button
            type="button"
            style={{ ...btnOutline, padding: '8px 12px', fontSize: '12px' }}
            onClick={() => {
              setAktivan('termini')
              setTerminFilter('danas')
              setIzabraniDatum(todayKey)
            }}
          >
            Otvori kalendar →
          </button>
        </div>
        {danasnjiTermini.length === 0
          ? <p style={{ fontSize: '13px', color: muted }}>Za danas nema zakazanih termina.</p>
          : danasnjiTermini.slice(0, 6).map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 4 ? `0.5px solid rgba(255,255,255,.06)` : 'none', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', background: goldFaint, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: gold, flexShrink: 0, textAlign: 'center' }}>
                  {formatVremeBelgrad(t.datum_vrijeme)}
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: text, fontWeight: 500 }}>{t.ime_klijenta}</div>
                  <div style={{ fontSize: '12px', color: muted }}>{t.usluge?.naziv || 'Bez usluge'} · {formatDatumBelgrad(t.datum_vrijeme)}</div>
                </div>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background:
                    t.status === 'potvrđen'
                      ? 'rgba(50,200,100,.1)'
                      : t.status === 'otkazan'
                        ? 'rgba(200,80,80,.12)'
                        : goldFaint,
                  color: t.status === 'potvrđen' ? '#4caf81' : t.status === 'otkazan' ? '#e07a7a' : gold,
                  border: `0.5px solid ${
                    t.status === 'potvrđen'
                      ? 'rgba(50,200,100,.2)'
                      : t.status === 'otkazan'
                        ? 'rgba(220,100,100,.3)'
                        : goldBorder
                  }`,
                }}
              >
                {t.status}
              </div>
            </div>
          ))
        }
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 500, color: text, marginBottom: '12px' }}>⚠️ Upozorenja lagera</h3>
        {lager.filter(l => l.kolicina <= l.minimum).length === 0
          ? <p style={{ fontSize: '13px', color: muted }}>Sve zalihe su uredne ✓</p>
          : lager.filter(l => l.kolicina <= l.minimum).map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(220,80,50,.08)', border: '0.5px solid rgba(220,80,50,.2)', borderRadius: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#ff6b6b' }}>⚠️ {l.naziv} — samo {l.kolicina} {l.jedinica} (min: {l.minimum})</span>
            </div>
          ))
        }
      </div>
    </div>
  )

  const renderProfil = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {sauvano === 'profil' && (
        <div style={{ background: 'rgba(50,200,100,.1)', border: '0.5px solid rgba(50,200,100,.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#4caf81' }}>
          ✓ Profil je uspešno sačuvan!
        </div>
      )}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 500, color: text, marginBottom: '20px' }}>Logo salona</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '16px', background: goldFaint, border: `0.5px dashed ${gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => document.getElementById('logo-upload')?.click()}>
            {profil.logo
              // eslint-disable-next-line @next/next/no-img-element -- logo kao data URL ili spoljni fajl
              ? <img src={profil.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>📷</div>
                <div style={{ fontSize: '10px', color: muted }}>Dodaj logo</div>
              </div>
            }
          </div>
          <div>
            <p style={{ fontSize: '13px', color: muted, lineHeight: 1.7, marginBottom: '12px' }}>
              Preporučena veličina: 400x400px<br />Format: JPG, PNG · Max: 2MB
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button style={btnGold} onClick={() => document.getElementById('logo-upload')?.click()}>Učitaj logo</button>
              {profil.logo && <button style={btnOutline} onClick={() => setProfil({ ...profil, logo: '' })}>Ukloni</button>}
            </div>
          </div>
          <input id="logo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 500, color: text, marginBottom: '20px' }}>Informacije o salonu</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px' }}>
          {([
            { label: 'NAZIV SALONA', key: 'naziv', placeholder: 'Ime vašeg salona' },
            { label: 'TELEFON', key: 'telefon', placeholder: '+381 60 000 000' },
            { label: 'ADRESA', key: 'adresa', placeholder: 'Ulica i broj' },
            { label: 'GRAD', key: 'grad', placeholder: 'Vaš grad' },
          ] satisfies ProfilTextField[]).map(f => (
            <div key={f.key}>
              <label style={labelStyle}>{f.label}</label>
              <input style={inputStyle} value={profil[f.key]} placeholder={f.placeholder}
                onChange={e => setProfil({ ...profil, [f.key]: e.target.value })} />
            </div>
          ))}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>OPIS SALONA</label>
            <textarea style={{ ...inputStyle, height: '80px', resize: 'none' } as React.CSSProperties}
              value={profil.opis} placeholder="Kratki opis vašeg salona..."
              onChange={e => setProfil({ ...profil, opis: e.target.value })} />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 500, color: text, marginBottom: '20px' }}>Radno vreme</h3>
        <p style={{ fontSize: '12px', color: muted, lineHeight: 1.6, marginBottom: '14px' }}>
          Polja su opciona. Unesi ponedeljak-petak, subotu posebno, a za nedelju izaberi vreme ili označi da ne radiš.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px' }}>
          <div>
            <label style={labelStyle}>PON-PET OD</label>
            <input style={inputStyle} type="time" value={profil.radni_dani_od} onChange={e => setProfil({ ...profil, radni_dani_od: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>PON-PET DO</label>
            <input style={inputStyle} type="time" value={profil.radni_dani_do} onChange={e => setProfil({ ...profil, radni_dani_do: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>SUBOTA OD</label>
            <input style={inputStyle} type="time" value={profil.subota_od} onChange={e => setProfil({ ...profil, subota_od: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>SUBOTA DO</label>
            <input style={inputStyle} type="time" value={profil.subota_do} onChange={e => setProfil({ ...profil, subota_do: e.target.value })} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', gridColumn: '1/-1', color: text, fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={profil.nedelja_zatvoreno}
              onChange={e => setProfil({ ...profil, nedelja_zatvoreno: e.target.checked })}
            />
            Nedeljom ne radimo
          </label>
          {!profil.nedelja_zatvoreno && (
            <>
              <div>
                <label style={labelStyle}>NEDELJA OD</label>
                <input style={inputStyle} type="time" value={profil.nedelja_od} onChange={e => setProfil({ ...profil, nedelja_od: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>NEDELJA DO</label>
                <input style={inputStyle} type="time" value={profil.nedelja_do} onChange={e => setProfil({ ...profil, nedelja_do: e.target.value })} />
              </div>
            </>
          )}
        </div>
      </div>

      <button style={{...btnGold, padding:'14px', borderRadius:'12px', fontSize:'14px', width:'100%'}} onClick={sacuvajProfil}>
        Sačuvaj izmjene ✓
      </button>
    </div>
  )

  const renderUsluge = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
      {/* display:none blokira programski click() na nekim pregledačima; ostaje u DOM-u van ekrana */}
      <input
        ref={uslugaSlikaNovaInputRef}
        id="usluga-slika-nova-input"
        type="file"
        accept="image/*,.jpg,.jpeg,.jfif,.pjpeg,.png,.apng,.gif,.webp,.bmp,.tif,.tiff,.svg,.heic,.heif,.avif,.ico"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '1px',
          height: '1px',
          opacity: 0,
          overflow: 'hidden',
        }}
        tabIndex={-1}
        aria-label="Izaberi sliku za novu uslugu"
        onChange={(e) => void handleUslugaSlikaFajlNova(e)}
      />
      <input
        ref={uslugaSlikaPostojecaInputRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.jfif,.pjpeg,.png,.apng,.gif,.webp,.bmp,.tif,.tiff,.svg,.heic,.heif,.avif,.ico"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '1px',
          height: '1px',
          opacity: 0,
          overflow: 'hidden',
        }}
        tabIndex={-1}
        aria-label="Izaberi sliku za postojeću uslugu"
        onChange={(e) => void handleUslugaSlikaFajlPostojeca(e)}
      />
      {uslugaGreska ? (
        <div
          role="alert"
          style={{
            background: 'rgba(220,50,50,.1)',
            border: '0.5px solid rgba(220,50,50,.3)',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '12px',
            color: '#ff6b6b',
            lineHeight: 1.5,
          }}
        >
          ⚠️ {uslugaGreska}
        </div>
      ) : null}
      {usluge.length === 0 && !showNovaUsluga && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>💈</div>
          <p style={{ fontSize: '14px', color: muted, marginBottom: '16px' }}>Još nemaš dodanih usluga.</p>
        </div>
      )}
      {usluge.length > 0 ? (
        <>
          <style>{`
            .dash-usluge-grid{display:grid;width:100%;gap:10px;grid-template-columns:repeat(2,minmax(0,1fr));}
            @media(min-width:900px){.dash-usluge-grid{gap:14px;grid-template-columns:repeat(3,minmax(0,1fr));}}
            .dash-usluga-card{display:flex;flex-direction:column;max-width:100%;overflow:hidden;border-radius:14px;background:#161616;border:0.5px solid rgba(212,175,55,.15);}
            .dash-usluga-media{position:relative;width:100%;aspect-ratio:1/1;background:linear-gradient(145deg,${goldFaint},rgba(18,16,12,.95));border-bottom:0.5px solid ${goldBorder};}
            .dash-usluga-media--busy{cursor:default;opacity:0.65;}
            .dash-usluga-media--ok{cursor:pointer;}
            .dash-usluga-media img{width:100%;height:100%;object-fit:cover;display:block;}
            .dash-usluga-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:clamp(18px,11vw,28px);font-weight:700;color:rgba(212,175,55,.35);letter-spacing:0.04em;}
            .dash-usluga-body{padding:10px 11px 12px;display:flex;flex-direction:column;gap:6px;min-height:0;}
            .dash-usluga-title{font-size:clamp(12px,3vw,14px);font-weight:600;color:${text};line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
            .dash-usluga-meta{font-size:10px;color:${muted};margin-top:2px;line-height:1.35;}
            .dash-usluga-opis{font-size:10px;color:rgba(245,240,232,.32);margin-top:4px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
            .dash-usluga-lager{font-size:10px;color:rgba(245,240,232,.45);margin-top:6px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
            .dash-usluga-hint{font-size:9px;color:rgba(245,240,232,.32);line-height:1.45;}
          `}</style>
          <div className="dash-usluge-grid">
            {usluge.map((u) => {
              const busy = uslugaSlikaBusyId === u.id
              const inicijal = (u.naziv || '?').trim().charAt(0).toUpperCase() || '•'
              return (
                <div key={u.id} className="dash-usluga-card">
                  <div
                    role="presentation"
                    onClick={() => {
                      if (!busy) otvoriUslugaSlikuPickerPostojeca(u.id)
                    }}
                    className={`dash-usluga-media${busy ? ' dash-usluga-media--busy' : ' dash-usluga-media--ok'}`}
                    title={busy ? '' : 'Klikni da dodaš ili promeniš sliku'}
                  >
                    {u.slika_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- data URL ili spoljni URL
                      <img src={u.slika_url} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <div className="dash-usluga-ph" aria-hidden>
                        {inicijal}
                      </div>
                    )}
                  </div>
                  <div className="dash-usluga-body">
                    <div className="dash-usluga-title">{u.naziv}</div>
                    <div className="dash-usluga-meta">
                      {u.trajanje} min · {Number(u.cijena).toLocaleString()} RSD
                    </div>
                    {u.opis ? <div className="dash-usluga-opis">{u.opis}</div> : null}
                    {uslugaLager.filter((p) => p.usluga_id === u.id).length > 0 ? (
                      <div className="dash-usluga-lager">
                        Troši:{' '}
                        {uslugaLager
                          .filter((p) => p.usluga_id === u.id)
                          .map((p) => `${p.lager?.naziv || 'Artikal'} ${p.kolicina} ${p.lager?.jedinica || ''}`.trim())
                          .join(' · ')}
                      </div>
                    ) : null}
                    <div className="dash-usluga-hint">
                      Slika do 4 MB (JPG, PNG…). Klik na sličicu ili dugme ispod.
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                      <button type="button" style={{ ...btnGold, padding: '8px 10px', fontSize: '11px', opacity: busy ? 0.65 : 1 }} disabled={busy} onClick={() => otvoriUslugaSlikuPickerPostojeca(u.id)}>
                        {busy ? 'Obrada…' : u.slika_url ? 'Promeni' : 'Dodaj sliku'}
                      </button>
                      {u.slika_url ? (
                        <button type="button" style={{ ...btnOutline, padding: '8px 10px', fontSize: '11px' }} disabled={busy} onClick={() => void ukloniSlikuUsluge(u.id)}>
                          Ukloni
                        </button>
                      ) : null}
                      <button type="button" style={{ ...btnOutline, padding: '8px 10px', fontSize: '11px', marginLeft: 'auto' }} disabled={busy} onClick={() => obrisiUslugu(u.id)}>
                        Obriši
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : null}
      {showNovaUsluga ? (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: 500, color: text, marginBottom: '16px' }}>Nova usluga</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '12px', marginBottom: '14px' }}>
            <div><label style={labelStyle}>NAZIV</label><input style={inputStyle} placeholder="Šišanje" value={novaUsluga.naziv} onChange={(e) => setNovaUsluga((prev) => ({ ...prev, naziv: e.target.value }))} /></div>
            <div><label style={labelStyle}>CIJENA (RSD)</label><input style={inputStyle} placeholder="1500" value={novaUsluga.cijena} onChange={(e) => setNovaUsluga((prev) => ({ ...prev, cijena: e.target.value }))} /></div>
            <div><label style={labelStyle}>TRAJANJE (min)</label><input style={inputStyle} placeholder="45" value={novaUsluga.trajanje} onChange={(e) => setNovaUsluga((prev) => ({ ...prev, trajanje: e.target.value }))} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>OPIS (opciono)</label><input style={inputStyle} placeholder="Kratki opis usluge" value={novaUsluga.opis} onChange={(e) => setNovaUsluga((prev) => ({ ...prev, opis: e.target.value }))} /></div>
          </div>
          <div
            style={{
              marginBottom: '16px',
              padding: '14px',
              borderRadius: '12px',
              border: `0.5px solid ${goldBorder}`,
              background: 'rgba(255,255,255,.03)',
            }}
          >
            <div style={{ ...labelStyle, marginBottom: '10px' }}>SLIKA USLUGE (OPCIONO)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => otvoriUslugaSlikuPickerNova()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    otvoriUslugaSlikuPickerNova()
                  }
                }}
                title="Klikni da izabereš sliku (file input)"
                style={{
                  width: '120px',
                  height: '75px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: `0.5px solid ${goldBorder}`,
                  background: `linear-gradient(145deg,${goldFaint},#141210)`,
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                {novaUsluga.slika_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={novaUsluga.slika_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      fontWeight: 700,
                      color: 'rgba(212,175,55,.3)',
                      pointerEvents: 'none',
                    }}
                    aria-hidden
                  >
                    {(novaUsluga.naziv || '?').trim().charAt(0).toUpperCase() || '•'}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                <button type="button" style={{ ...btnGold, padding: '9px 14px', fontSize: '12px', alignSelf: 'flex-start' }} onClick={() => otvoriUslugaSlikuPickerNova()}>
                  Izaberi sliku
                </button>
                {novaUsluga.slika_url ? (
                  <button type="button" style={{ ...btnOutline, padding: '9px 14px', fontSize: '12px', alignSelf: 'flex-start' }} onClick={() => setNovaUsluga((prev) => ({ ...prev, slika_url: '' }))}>
                    Ukloni pregled
                  </button>
                ) : null}
                <span style={{ fontSize: '11px', color: 'rgba(245,240,232,.38)', maxWidth: '280px', lineHeight: 1.45 }}>
                  Klik na pregled ili „Izaberi sliku“ otvara izbor fajla (isti princip kao logo). Do 4 MB.
                </span>
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.03)', border: `0.5px solid ${goldBorder}`, borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: text }}>Potrošnja lagera</div>
                <div style={{ fontSize: '11px', color: muted, marginTop: '3px' }}>Izaberi artikle koji se skidaju kada potvrdiš termin za ovu uslugu.</div>
              </div>
              <button
                style={{ ...btnOutline, padding: '8px 12px', fontSize: '12px', opacity: lager.length === 0 ? 0.5 : 1 }}
                disabled={lager.length === 0}
                onClick={() => setNovaUslugaLager([...novaUslugaLager, { lager_id: lager[0]?.id || '', kolicina: '' }])}
              >
                + Dodaj potrošnju
              </button>
            </div>
            {lager.length === 0 ? (
              <p style={{ fontSize: '12px', color: muted }}>Prvo dodaj artikle u lager, pa ih možeš vezati za uslugu.</p>
            ) : novaUslugaLager.length === 0 ? (
              <p style={{ fontSize: '12px', color: muted }}>Nije dodata potrošnja. Usluga neće automatski skidati lager.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {novaUslugaLager.map((item, idx) => {
                  const selected = lager.find((l) => l.id === item.lager_id)
                  return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) minmax(100px,140px) auto', gap: '8px', alignItems: 'end' }}>
                      <div>
                        <label style={labelStyle}>ARTIKAL</label>
                        <select
                          style={inputStyle}
                          value={item.lager_id}
                          onChange={(e) =>
                            setNovaUslugaLager(novaUslugaLager.map((row, i) => (i === idx ? { ...row, lager_id: e.target.value } : row)))
                          }
                        >
                          {lager.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.naziv} ({l.kolicina} {l.jedinica})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>KOLIČINA</label>
                        <input
                          style={inputStyle}
                          placeholder={selected?.jedinica ? `npr. 20 ${selected.jedinica}` : 'npr. 1'}
                          value={item.kolicina}
                          onChange={(e) =>
                            setNovaUslugaLager(novaUslugaLager.map((row, i) => (i === idx ? { ...row, kolicina: e.target.value } : row)))
                          }
                        />
                      </div>
                      <button
                        style={{ ...btnOutline, padding: '11px 12px' }}
                        onClick={() => setNovaUslugaLager(novaUslugaLager.filter((_, i) => i !== idx))}
                      >
                        Ukloni
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={btnGold} disabled={uslugaLoading} onClick={dodajUslugu}>{uslugaLoading ? 'Dodavanje...' : 'Dodaj uslugu'}</button>
            <button
              type="button"
              style={btnOutline}
              onClick={() => {
                setShowNovaUsluga(false)
                setUslugaGreska('')
                setNovaUslugaLager([])
                setNovaUsluga({ naziv: '', cijena: '', trajanje: '', opis: '', slika_url: '' })
              }}
            >
              Odustani
            </button>
          </div>
        </div>
      ) : (
        <button style={{ ...btnGold, padding: '14px', borderRadius: '12px', fontSize: '14px', width: '100%' }} onClick={() => { setShowNovaUsluga(true); setUslugaGreska('') }}>
          + Dodaj novu uslugu
        </button>
      )}
    </div>
  )

  const renderZaposleni = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 500, color: text, marginBottom: '8px' }}>Zaposleni</h3>
          <p style={{ fontSize: '12px', color: muted, lineHeight: 1.6 }}>
          Ako salon ima više zaposlenih, kupac će pri zakazivanju izabrati kod koga želi termin. Fotografija je opciona; bez nje se prikazuje avatar sa inicijalima.
        </p>
      </div>
      {zaposleniGreska && (
        <div style={{ background: 'rgba(220,50,50,.1)', border: '0.5px solid rgba(220,50,50,.3)', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#ff6b6b' }}>
          ⚠️ {zaposleniGreska}
        </div>
      )}
      {zaposleni.length === 0 && !showNoviZaposleni && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '34px' }}>
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>✂️</div>
          <p style={{ fontSize: '14px', color: muted }}>Dodaj zaposlene da bi kupci mogli da biraju osobu za termin.</p>
        </div>
      )}
      {zaposleni.map((z) => (
        <div key={z.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', opacity: z.aktivan ? 1 : 0.58 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {renderEmployeeAvatar(z, 46)}
            <div>
              <div style={{ fontSize: '15px', fontWeight: 500, color: text }}>{z.ime}</div>
              <div style={{ fontSize: '12px', color: muted, marginTop: '3px' }}>{z.uloga || 'Zaposleni'} · {z.aktivan ? 'aktivan' : 'sakriven za kupce'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button style={btnOutline} onClick={() => void podesiAktivnostZaposlenog(z.id, !z.aktivan)}>
              {z.aktivan ? 'Sakrij' : 'Aktiviraj'}
            </button>
            <button style={btnOutline} onClick={() => void obrisiZaposlenog(z.id)}>Obriši</button>
          </div>
        </div>
      ))}
      {showNoviZaposleni ? (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: 500, color: text, marginBottom: '16px' }}>Novi zaposleni</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>IME</label>
              <input style={inputStyle} placeholder="Ana Marković" value={noviZaposleni.ime} onChange={e => setNoviZaposleni({ ...noviZaposleni, ime: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>ULOGA</label>
              <input style={inputStyle} placeholder="Frizer, barber, kozmetičar..." value={noviZaposleni.uloga} onChange={e => setNoviZaposleni({ ...noviZaposleni, uloga: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>FOTOGRAFIJA (OPCIONO)</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {renderEmployeeAvatar({ ime: noviZaposleni.ime || 'Zaposleni', foto_url: noviZaposleni.foto_url } as ZaposleniRow, 58)}
                <input id="zaposleni-photo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleZaposleniFotoUpload} />
                <button style={btnOutline} onClick={() => document.getElementById('zaposleni-photo-upload')?.click()}>Učitaj fotografiju</button>
                {noviZaposleni.foto_url && (
                  <button style={btnOutline} onClick={() => setNoviZaposleni({ ...noviZaposleni, foto_url: '' })}>Ukloni</button>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button style={btnGold} onClick={() => void dodajZaposlenog()}>Dodaj zaposlenog</button>
            <button style={btnOutline} onClick={() => { setShowNoviZaposleni(false); setZaposleniGreska('') }}>Odustani</button>
          </div>
        </div>
      ) : (
        <button style={{ ...btnGold, padding: '14px', borderRadius: '12px', fontSize: '14px', width: '100%' }} onClick={() => { setShowNoviZaposleni(true); setZaposleniGreska('') }}>
          + Dodaj zaposlenog
        </button>
      )}
    </div>
  )

  const renderLager = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {lager.length === 0 && !showNoviLager && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📦</div>
          <p style={{ fontSize: '14px', color: muted }}>Lager je prazan. Dodaj prvi artikal.</p>
        </div>
      )}
      {lager.map(l => (
        <div
          key={l.id}
          style={{
            ...cardStyle,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            borderColor: l.kolicina <= l.minimum ? 'rgba(220,80,50,.3)' : goldBorder,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '42px', height: '42px', background: l.kolicina <= l.minimum ? 'rgba(220,80,50,.1)' : goldFaint, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {l.kolicina <= l.minimum ? '⚠️' : '📦'}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 500, color: text }}>{l.naziv}</div>
                <div style={{ fontSize: '12px', color: muted }}>{l.kategorija} · Min: {l.minimum} {l.jedinica}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 500, color: l.kolicina <= l.minimum ? '#ff6b6b' : gold }}>{l.kolicina}</div>
                <div style={{ fontSize: '11px', color: muted }}>{l.jedinica}</div>
              </div>
              {lagerPrijem.lagerId === l.id ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>DODAJ NA ZALIHU ({l.jedinica || 'kom'})</label>
                    <input
                      style={{ ...inputStyle, width: 'min(120px, 100%)' }}
                      type="number"
                      min={1}
                      max={1_000_000}
                      inputMode="numeric"
                      placeholder="npr. 5"
                      disabled={lagerPrijemLoading}
                      value={lagerPrijem.kolicina}
                      onChange={(e) => setLagerPrijem((p) => (p.lagerId === l.id ? { ...p, kolicina: e.target.value } : p))}
                    />
                  </div>
                  <button type="button" style={btnGold} disabled={lagerPrijemLoading} onClick={() => void potvrdiPrijemZalihe()}>
                    {lagerPrijemLoading ? '…' : 'Dodaj'}
                  </button>
                  <button
                    type="button"
                    style={btnOutline}
                    disabled={lagerPrijemLoading}
                    onClick={() => {
                      setLagerPrijem({ lagerId: null, kolicina: '' })
                      setLagerPrijemGreska('')
                    }}
                  >
                    Odustani
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  style={btnOutline}
                  onClick={() => {
                    setLagerPrijem({ lagerId: l.id, kolicina: '' })
                    setLagerPrijemGreska('')
                    setShowNoviLager(false)
                    setLagerGreska('')
                  }}
                >
                  Dodaj zalihu
                </button>
              )}
              <button type="button" style={btnOutline} onClick={() => obrisiLager(l.id)}>Obriši</button>
            </div>
          </div>
          {lagerPrijem.lagerId === l.id && lagerPrijemGreska ? (
            <div style={{ background: 'rgba(220,50,50,.1)', border: '0.5px solid rgba(220,50,50,.3)', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#ff6b6b' }}>
              ⚠️ {lagerPrijemGreska}
            </div>
          ) : null}
        </div>
      ))}
      {showNoviLager ? (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: 500, color: text, marginBottom: '16px' }}>Novi artikal</h3>
          {lagerGreska && (
            <div style={{ background: 'rgba(220,50,50,.1)', border: '0.5px solid rgba(220,50,50,.3)', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px', fontSize: '12px', color: '#ff6b6b' }}>
              ⚠️ {lagerGreska}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '12px', marginBottom: '14px' }}>
            <div><label style={labelStyle}>NAZIV</label><input style={inputStyle} placeholder="Farba #5" value={noviLager.naziv} onChange={e => setNoviLager({ ...noviLager, naziv: e.target.value })} /></div>
            <div><label style={labelStyle}>KATEGORIJA</label><input style={inputStyle} placeholder="Boje" value={noviLager.kategorija} onChange={e => setNoviLager({ ...noviLager, kategorija: e.target.value })} /></div>
            <div><label style={labelStyle}>KOLIČINA</label><input style={inputStyle} placeholder="10" value={noviLager.kolicina} onChange={e => setNoviLager({ ...noviLager, kolicina: e.target.value })} /></div>
            <div><label style={labelStyle}>MINIMUM</label><input style={inputStyle} placeholder="5" value={noviLager.minimum} onChange={e => setNoviLager({ ...noviLager, minimum: e.target.value })} /></div>
            <div>
              <label style={labelStyle}>JEDINICA</label>
              <select style={inputStyle} value={noviLager.jedinica} onChange={e => setNoviLager({ ...noviLager, jedinica: e.target.value })}>
                {['kom', 'L', 'ml', 'kg', 'g', 'pakovanje'].map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={btnGold} onClick={dodajLager}>Dodaj artikal</button>
            <button style={btnOutline} onClick={() => { setShowNoviLager(false); setLagerGreska(''); setLagerPrijem({ lagerId: null, kolicina: '' }); setLagerPrijemGreska('') }}>Odustani</button>
          </div>
        </div>
      ) : (
        <button
          style={{ ...btnGold, padding: '14px', borderRadius: '12px', fontSize: '14px', width: '100%' }}
          onClick={() => {
            setShowNoviLager(true)
            setLagerGreska('')
            setLagerPrijem({ lagerId: null, kolicina: '' })
            setLagerPrijemGreska('')
          }}
        >
          + Dodaj artikal u lager
        </button>
      )}
    </div>
  )

  const renderTermini = () => {
    const filterTabs: Array<{ id: TerminFilter; label: string; count: number }> = [
      { id: 'danas', label: 'Danas', count: danasnjiTermini.length },
      { id: 'buduci', label: 'Budući', count: buduciTermini.length },
      { id: 'prosli', label: 'Prošli', count: prosliTermini.length },
      { id: 'svi', label: 'Svi', count: termini.length },
    ]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: text, marginBottom: '6px' }}>
                Termini po datumu
              </h3>
              <p style={{ fontSize: '12px', color: muted, lineHeight: 1.5 }}>
                Primarno vidiš današnji raspored, a po potrebi možeš otvoriti prošle, buduće ili sve termine.
              </p>
            </div>
            <div style={{ minWidth: 190 }}>
              <label style={labelStyle}>IZABERI DATUM</label>
              <input
                style={inputStyle}
                type="date"
                value={izabraniDatum}
                onChange={(e) => {
                  setIzabraniDatum(e.target.value || todayKey)
                  setTerminFilter('datum')
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTerminFilter(tab.id)}
                style={{
                  ...(terminFilter === tab.id ? btnGold : btnOutline),
                  padding: '9px 13px',
                  fontSize: '12px',
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTerminFilter('datum')}
              style={{
                ...(terminFilter === 'datum' ? btnGold : btnOutline),
                padding: '9px 13px',
                fontSize: '12px',
              }}
            >
              Datum ({terminiZaIzabraniDatum.length})
            </button>
          </div>

          {terminiPotvrdaGreska && (
            <div style={{ background: 'rgba(220,50,50,.1)', border: '0.5px solid rgba(220,50,50,.3)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', fontSize: '12px', color: '#ff6b6b' }}>
              ⚠️ {terminiPotvrdaGreska}
            </div>
          )}

          <div style={{ marginBottom: '12px', fontSize: '12px', color: muted }}>
            Prikaz: <span style={{ color: gold }}>{terminFilterLabel}</span>
          </div>

          {filtriraniTermini.length === 0 ? (
            <p style={{ fontSize: '13px', color: muted }}>Nema termina za ovaj prikaz.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtriraniTermini.map((t) => {
                const terminVrijeme = formatVremeBelgrad(t.datum_vrijeme)
                const terminDatum = formatDatumBelgrad(t.datum_vrijeme)
                const statusColor =
                  t.status === 'potvrđen'
                    ? '#4caf81'
                    : t.status === 'otkazan'
                      ? '#e07a7a'
                      : t.status === 'nije_dosao'
                        ? '#ff8a8a'
                        : gold
                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                      padding: '14px',
                      border: `0.5px solid ${goldBorder}`,
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,.018)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 220, flex: '1 1 260px' }}>
                      <div style={{ width: '52px', minHeight: '52px', background: goldFaint, borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: gold, textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>{terminVrijeme}</span>
                        <span style={{ fontSize: '9px', color: muted, marginTop: 2 }}>{terminDatum}</span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: text }}>{t.ime_klijenta}</div>
                        <div style={{ fontSize: '12px', color: muted, marginTop: 3 }}>{t.usluge?.naziv || 'Bez usluge'}</div>
                        {t.zaposleni_id && (
                          <div style={{ fontSize: '11px', color: 'rgba(245,240,232,.45)', marginTop: 3 }}>
                            Kod: {zaposleni.find((z) => z.id === t.zaposleni_id)?.ime || 'zaposleni'}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: 'rgba(245,240,232,.35)', marginTop: 3 }}>{t.telefon_klijenta}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', flex: '1 1 220px' }}>
                      <div
                        style={{
                          fontSize: '11px',
                          padding: '5px 10px',
                          borderRadius: '20px',
                          background: 'rgba(255,255,255,.035)',
                          color: statusColor,
                          border: `0.5px solid ${goldBorder}`,
                        }}
                      >
                        {t.status}
                      </div>
                      {t.status !== 'potvrđen' && t.status !== 'otkazan' && t.status !== 'nije_dosao' && (
                        <button style={btnGold} onClick={() => potvrdiTermin(t.id)}>Potvrdi</button>
                      )}
                      {t.status !== 'otkazan' && t.status !== 'nije_dosao' && (
                        <button style={btnOutline} onClick={() => void oznaciDaNijeDosao(t.id)}>Nije došao</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderStranica = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 500, color: text, marginBottom: '16px' }}>Tvoja landing page</h3>
        <div style={{ background: goldFaint, border: `0.5px solid ${goldBorder}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: muted, marginBottom: '6px' }}>TVOJ LINK</div>
          <div style={{ fontSize: '15px', color: gold, fontWeight: 500, wordBreak: 'break-all' }}>
            {getPublicSiteBase() || '…'}/salon/{resolvedSlug}
          </div>
          {!process.env.NEXT_PUBLIC_SITE_URL?.trim() && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (
            <p style={{ fontSize: 11, color: 'rgba(245,240,232,.35)', marginTop: 8, lineHeight: 1.45 }}>
              Lokalni prikaz: QR i kopirani link koriste localhost. Za produkciju dodaj u Vercel (ili .env.local) varijablu{' '}
              <code style={{ color: gold }}>NEXT_PUBLIC_SITE_URL</code> punim URL-om salona (npr. https://app.vercel.app).
            </p>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            style={btnGold}
            disabled={!resolvedSlug}
            onClick={() => navigator.clipboard.writeText(`${getPublicSiteBase()}/salon/${resolvedSlug}`)}
          >
            Kopiraj link
          </button>
          <a href={`/salon/${resolvedSlug}`} target="_blank" rel="noreferrer" style={{ ...btnOutline, textDecoration: 'none', display: 'inline-block', pointerEvents: resolvedSlug ? 'auto' : 'none', opacity: resolvedSlug ? 1 : 0.5 }}>
            Otvori stranicu →
          </a>
        </div>
      </div>
      <div style={cardStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: 500, color: text, marginBottom: '16px' }}>QR kod</h3>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 132,
              height: 132,
              flexShrink: 0,
              background: '#fff',
              borderRadius: 12,
              padding: 6,
              border: `0.5px solid ${goldBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {qrLoading ? (
              <span style={{ fontSize: 12, color: muted }}>Generisanje…</span>
            ) : qrError ? (
              <span style={{ fontSize: 11, color: '#ff8a8a', textAlign: 'center', padding: 4 }}>{qrError}</span>
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- generisan QR kao data URL
              <img src={qrDataUrl} alt={`QR kod za ${resolvedSlug}`} width={120} height={120} style={{ display: 'block' }} />
            ) : (
              <span style={{ fontSize: 12, color: muted }}>Nema sluga</span>
            )}
          </div>
          <div style={{ minWidth: 0, flex: '1 1 200px' }}>
            <p style={{ fontSize: '13px', color: muted, lineHeight: 1.7, marginBottom: '14px' }}>
              Odštampaj QR kod i postavi ga u salon.<br />
              Klijenti skeniranjem dolaze na tvoju stranicu (isti link kao gore).
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" style={btnGold} disabled={!qrDataUrl || qrLoading} onClick={preuzmiQrPng}>
                Preuzmi PNG
              </button>
              <button type="button" style={btnOutline} disabled={!qrSvg || qrLoading} onClick={preuzmiQrSvg}>
                Preuzmi SVG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const dodajRashod = async () => {
    const naziv = noviRashod.naziv.trim()
    const iznos = parseFloat(noviRashod.iznos.replace(',', '.'))
    if (!naziv || Number.isNaN(iznos) || iznos <= 0) {
      setRashodGreska('Unesite naziv i ispravan iznos.')
      return
    }
    setRashodGreska('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !salon?.id) return
    const { data, error } = await supabase.from('rashodi').insert({
      salon_id: salon.id,
      naziv,
      iznos,
      kategorija: noviRashod.kategorija || 'Ostalo',
      datum: noviRashod.datum || getLocalDateKey(new Date()),
      napomena: noviRashod.napomena.trim() || null,
    }).select().single()
    if (error) {
      setRashodGreska(formatSalonFkErrorMessage(error.message))
      return
    }
    if (data) {
      setRashodi(prev => [data, ...prev])
      setNoviRashod({ naziv: '', iznos: '', kategorija: 'Ostalo', datum: getLocalDateKey(new Date()), napomena: '' })
      setShowNoviRashod(false)
    }
  }

  const obrisiRashod = async (id: string) => {
    await supabase.from('rashodi').delete().eq('id', id)
    setRashodi(prev => prev.filter(r => r.id !== id))
  }

  const renderAnalitika = () => {
    const now = new Date()
    const periodStart = (() => {
      switch (analitikaPeriod) {
        case 'danas': { const d = new Date(now); d.setHours(0,0,0,0); return d }
        case 'sedmica': { const d = new Date(now); d.setDate(d.getDate() - 7); return d }
        case 'mesec': { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d }
        case 'godina': { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d }
        default: return new Date(0)
      }
    })()

    const uslugeMap = new Map(usluge.map(u => [u.id, u]))
    const relevantTermini = termini.filter(t => {
      const d = new Date(t.datum_vrijeme)
      return d >= periodStart && (t.status === 'potvrđen' || t.status === 'završen')
    })
    const prihod = relevantTermini.reduce((sum, t) => {
      const u = t.usluga_id ? uslugeMap.get(t.usluga_id) : null
      return sum + (u ? Number(u.cijena) : 0)
    }, 0)

    const relevantRashodi = rashodi.filter(r => {
      const d = new Date(r.datum + 'T12:00:00')
      return d >= periodStart
    })
    const ukupanRashod = relevantRashodi.reduce((sum, r) => sum + Number(r.iznos), 0)
    const profit = prihod - ukupanRashod

    const prihodPoUsluzi = new Map<string, { naziv: string; prihod: number; count: number }>()
    for (const t of relevantTermini) {
      const u = t.usluga_id ? uslugeMap.get(t.usluga_id) : null
      if (u) {
        const existing = prihodPoUsluzi.get(u.id)
        if (existing) {
          existing.prihod += Number(u.cijena)
          existing.count += 1
        } else {
          prihodPoUsluzi.set(u.id, { naziv: u.naziv, prihod: Number(u.cijena), count: 1 })
        }
      }
    }
    const topUsluge = Array.from(prihodPoUsluzi.values()).sort((a, b) => b.prihod - a.prihod)
    const maxPrihod = topUsluge.length > 0 ? topUsluge[0].prihod : 1

    const rashodPoKategoriji = new Map<string, number>()
    for (const r of relevantRashodi) {
      rashodPoKategoriji.set(r.kategorija, (rashodPoKategoriji.get(r.kategorija) || 0) + Number(r.iznos))
    }
    const topKategorije = Array.from(rashodPoKategoriji.entries()).sort((a, b) => b[1] - a[1])
    const maxRashod = topKategorije.length > 0 ? topKategorije[0][1] : 1

    const periodLabels: Record<AnalitikaPeriod, string> = {
      danas: 'Danas', sedmica: 'Ova sedmica', mesec: 'Ovaj mesec', godina: 'Ova godina', svi: 'Svi podaci',
    }

    const klijentModalTermini =
      analitikaKlijentDetaljKljuc === null
        ? []
        : termini
            .filter((t) => {
              const d = new Date(t.datum_vrijeme)
              return (
                d >= periodStart &&
                (t.status === 'potvrđen' || t.status === 'završen') &&
                klijentGrupacijaKljuc(t) === analitikaKlijentDetaljKljuc
              )
            })
            .sort((a, b) => new Date(a.datum_vrijeme).getTime() - new Date(b.datum_vrijeme).getTime())
    const klijentModalUkupno = klijentModalTermini.reduce((s, t) => s + prometTerminaUSalonu(t, uslugeMap), 0)
    const klijentModalIme = (klijentModalTermini[0]?.ime_klijenta || '').trim() || 'Klijent'
    const klijentModalTel = (klijentModalTermini[0]?.telefon_klijenta || '').trim()

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(periodLabels) as AnalitikaPeriod[]).map(p => (
            <button key={p} type="button" onClick={() => setAnalitikaPeriod(p)}
              style={{ ...(analitikaPeriod === p ? btnGold : btnOutline), padding: '9px 14px', fontSize: '12px' }}>
              {periodLabels[p]}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px' }}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: muted, marginBottom: '6px' }}>PRIHOD</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#4caf81' }}>{prihod.toLocaleString()} <span style={{ fontSize: '14px' }}>RSD</span></div>
            <div style={{ fontSize: '11px', color: muted, marginTop: '4px' }}>{relevantTermini.length} potvrđenih termina</div>
          </div>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: muted, marginBottom: '6px' }}>RASHOD</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#e07a7a' }}>{ukupanRashod.toLocaleString()} <span style={{ fontSize: '14px' }}>RSD</span></div>
            <div style={{ fontSize: '11px', color: muted, marginTop: '4px' }}>{relevantRashodi.length} stavki</div>
          </div>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: muted, marginBottom: '6px' }}>PROFIT</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: profit >= 0 ? gold : '#e07a7a' }}>{profit.toLocaleString()} <span style={{ fontSize: '14px' }}>RSD</span></div>
            <div style={{ fontSize: '11px', color: muted, marginTop: '4px' }}>prihod − rashod</div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '15px', fontWeight: 500, color: text, marginBottom: '10px' }}>Preporuke i Pamet pretplata</h3>
          <p style={{ fontSize: '12px', color: muted, lineHeight: 1.55, marginBottom: '14px' }}>
            Podeli link ispod sa kolegama. Kada se <strong style={{ color: text }}>{PREPORUKE_ZA_POPUST}</strong> nova salona registruju preko tvog koda, godišnja pretplata je{' '}
            <strong style={{ color: gold }}>{GODISNJA_CIJENA_SA_REF_EUR} €</strong> umesto {GODISNJA_CIJENA_EUR} €.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: gold, letterSpacing: '2px' }}>{salon?.referal_kod || '—'}</div>
            <button
              type="button"
              style={{ ...btnOutline, padding: '8px 14px', fontSize: '12px' }}
              disabled={!salon?.referal_kod}
              onClick={async () => {
                if (!salon?.referal_kod) return
                const url = `${getPublicSiteBase()}/registracija?ref=${encodeURIComponent(salon.referal_kod)}`
                try {
                  await navigator.clipboard.writeText(url)
                  setReferalKopiran(true)
                  window.setTimeout(() => setReferalKopiran(false), 2200)
                } catch {
                  window.prompt('Kopiraj link:', url)
                }
              }}
            >
              Kopiraj link za registraciju
            </button>
            {referalKopiran ? <span style={{ fontSize: '12px', color: '#4caf81' }}>Kopirano u clipboard</span> : null}
          </div>
          <div style={{ fontSize: '13px', color: text, marginBottom: '8px' }}>
            Preporučena salona: <strong>{preporuceneSalone.length}</strong> / {PREPORUKE_ZA_POPUST} · Trenutna godišnja cena:{' '}
            <strong style={{ color: gold }}>{godisnjaCijenaZaBrojPreporuka(preporuceneSalone.length)} €</strong>
          </div>
          {preporuceneSalone.length > 0 ? (
            <ul style={{ margin: '10px 0 0', paddingLeft: '18px', fontSize: '12px', color: muted, lineHeight: 1.65 }}>
              {preporuceneSalone.map((p, idx) => (
                <li key={idx}>
                  {p.naziv}
                  {p.created_at ? (
                    <span style={{ color: 'rgba(245,240,232,.28)' }}>
                      {' '}
                      · {new Date(p.created_at).toLocaleDateString('sr-Latn-RS')}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '12px', color: 'rgba(245,240,232,.28)', marginTop: '8px' }}>Još nema registrovanih salona preko tvog koda.</p>
          )}
        </div>

        {(() => {
          const zaposleniImena = new Map(zaposleni.map((z) => [z.id, z.ime]))

          type ZaposleniAgregat = {
            storageKljuc: string
            ime: string
            brojTermina: number
            promet: number
            poUsluzi: { naziv: string; broj: number; promet: number }[]
          }

          const zaposleniGrupa = new Map<string | null, TerminRow[]>()
          for (const t of relevantTermini) {
            const zid = t.zaposleni_id ?? null
            if (!zaposleniGrupa.has(zid)) zaposleniGrupa.set(zid, [])
            zaposleniGrupa.get(zid)!.push(t)
          }

          const zaposleniAgregati: ZaposleniAgregat[] = []
          for (const [zid, lista] of zaposleniGrupa) {
            const storageKljuc = zid ?? ANALITIKA_BEZ_ZAPOSLENOG
            const ime = zid ? zaposleniImena.get(zid) || 'Zaposleni' : 'Bez dodeljenog zaposlenog'
            let promet = 0
            const poUsluziMap = new Map<string, { naziv: string; broj: number; promet: number }>()
            for (const t of lista) {
              const c = prometTerminaUSalonu(t, uslugeMap)
              promet += c
              const uid = t.usluga_id || ''
              const u = t.usluga_id ? uslugeMap.get(t.usluga_id) : null
              const naziv = u?.naziv || 'Bez usluge'
              const cur = poUsluziMap.get(uid) || { naziv, broj: 0, promet: 0 }
              cur.naziv = naziv
              cur.broj += 1
              cur.promet += c
              poUsluziMap.set(uid, cur)
            }
            const poUsluzi = [...poUsluziMap.values()].sort((a, b) => b.promet - a.promet)
            zaposleniAgregati.push({
              storageKljuc,
              ime,
              brojTermina: lista.length,
              promet,
              poUsluzi,
            })
          }
          zaposleniAgregati.sort((a, b) => b.promet - a.promet || b.brojTermina - a.brojTermina)
          const maxZPromet = zaposleniAgregati.length > 0 ? Math.max(...zaposleniAgregati.map((r) => r.promet), 1) : 1

          type VerniRed = { kljuc: string; ime: string; broj: number; promet: number }
          const verniMapa = new Map<string, VerniRed>()
          for (const t of relevantTermini) {
            const key = klijentGrupacijaKljuc(t)
            const c = prometTerminaUSalonu(t, uslugeMap)
            const ime = (t.ime_klijenta || '').trim() || 'Nepoznato'
            const postoji = verniMapa.get(key)
            if (postoji) {
              postoji.broj += 1
              postoji.promet += c
            } else {
              verniMapa.set(key, { kljuc: key, ime, broj: 1, promet: c })
            }
          }
          const verniLista = [...verniMapa.values()].sort((a, b) => b.promet - a.promet || b.broj - a.broj).slice(0, 15)
          const maxVerniPromet = verniLista.length > 0 ? Math.max(...verniLista.map((v) => v.promet), 1) : 1

          return (
            <>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, color: text, marginBottom: '6px' }}>Zaposleni — promet i usluge</h3>
                <p style={{ fontSize: '12px', color: muted, marginBottom: '14px' }}>
                  Potvrđeni i završeni termini u periodu: broj termina, ukupan promet (RSD) i raspodela po uslugama. Otvori „Detalji” za tabelu usluga.
                </p>
                {zaposleniAgregati.length === 0 ? (
                  <p style={{ fontSize: '13px', color: muted }}>Nema termina u ovom periodu.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {zaposleniAgregati.map((row) => {
                      const otvoren = analitikaZaposleniDetaljKljuc === row.storageKljuc
                      return (
                        <div
                          key={row.storageKljuc}
                          style={{
                            border: `0.5px solid ${goldBorder}`,
                            borderRadius: '12px',
                            padding: '12px 14px',
                            background: 'rgba(255,255,255,.018)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 500, color: text }}>{row.ime}</div>
                              <div style={{ fontSize: '12px', color: muted, marginTop: '4px' }}>
                                {row.brojTermina} {row.brojTermina === 1 ? 'termin' : 'termina'} ·{' '}
                                <span style={{ color: gold, fontWeight: 600 }}>{row.promet.toLocaleString('sr-Latn-RS')} RSD</span> prometa
                              </div>
                            </div>
                            <button
                              type="button"
                              style={{ ...btnOutline, padding: '8px 14px', fontSize: '12px', flexShrink: 0 }}
                              onClick={() =>
                                setAnalitikaZaposleniDetaljKljuc((prev) => (prev === row.storageKljuc ? null : row.storageKljuc))
                              }
                            >
                              {otvoren ? 'Sakrij detalje' : 'Detalji'}
                            </button>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(255,255,255,.06)', borderRadius: '3px', overflow: 'hidden', marginTop: '10px' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${(row.promet / maxZPromet) * 100}%`,
                                background: `linear-gradient(90deg,${gold},#b8960c)`,
                                borderRadius: '3px',
                                transition: 'width .3s',
                              }}
                            />
                          </div>
                          {otvoren && row.poUsluzi.length > 0 ? (
                            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: `0.5px solid ${goldBorder}` }}>
                              <div style={{ fontSize: '11px', color: muted, marginBottom: '8px', letterSpacing: '0.04em' }}>USLUGE U PERIODU</div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                  <tr style={{ color: muted, textAlign: 'left' }}>
                                    <th style={{ padding: '6px 8px', fontWeight: 500 }}>Usluga</th>
                                    <th style={{ padding: '6px 8px', fontWeight: 500, width: '72px' }}>Termina</th>
                                    <th style={{ padding: '6px 8px', fontWeight: 500, width: '100px', textAlign: 'right' }}>Promet</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.poUsluzi.map((u, uidx) => (
                                    <tr key={uidx} style={{ borderTop: '0.5px solid rgba(255,255,255,.06)' }}>
                                      <td style={{ padding: '8px', color: text }}>{u.naziv}</td>
                                      <td style={{ padding: '8px', color: muted }}>{u.broj}</td>
                                      <td style={{ padding: '8px', textAlign: 'right', color: gold, fontWeight: 500 }}>{u.promet.toLocaleString('sr-Latn-RS')} RSD</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr style={{ borderTop: `0.5px solid ${goldBorder}` }}>
                                    <td style={{ padding: '8px', fontWeight: 600, color: text }}>Ukupno</td>
                                    <td style={{ padding: '8px', fontWeight: 600, color: text }}>{row.brojTermina}</td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: gold }}>{row.promet.toLocaleString('sr-Latn-RS')} RSD</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          ) : null}
                          {otvoren && row.poUsluzi.length === 0 ? (
                            <p style={{ fontSize: '12px', color: muted, marginTop: '12px' }}>Nema povezanih usluga na terminima u ovom periodu.</p>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={cardStyle}>
                <h3 style={{ fontSize: '15px', fontWeight: 500, color: text, marginBottom: '6px' }}>Verni klijenti</h3>
                <p style={{ fontSize: '12px', color: muted, marginBottom: '14px' }}>
                  Klijenti sa najviše prometa u izabranom periodu (grupa po nalogu ili telefonu + imenu). Dugme „Detalji” prikazuje sve termine i ukupnu potrošnju.
                </p>
                {verniLista.length === 0 ? (
                  <p style={{ fontSize: '13px', color: muted }}>Nema podataka za ovaj period.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {verniLista.map((v) => (
                      <div
                        key={v.kljuc}
                        style={{
                          border: `0.5px solid ${goldBorder}`,
                          borderRadius: '12px',
                          padding: '12px 14px',
                          background: 'rgba(255,255,255,.018)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: text }}>{v.ime}</div>
                            <div style={{ fontSize: '12px', color: muted, marginTop: '4px' }}>
                              {v.broj} {v.broj === 1 ? 'termin' : 'termina'} ·{' '}
                              <span style={{ color: gold, fontWeight: 600 }}>{v.promet.toLocaleString('sr-Latn-RS')} RSD</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            style={{ ...btnGold, padding: '8px 14px', fontSize: '12px', flexShrink: 0 }}
                            onClick={() => setAnalitikaKlijentDetaljKljuc(v.kljuc)}
                          >
                            Detalji
                          </button>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,.06)', borderRadius: '3px', overflow: 'hidden', marginTop: '10px' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${(v.promet / maxVerniPromet) * 100}%`,
                              background: `linear-gradient(90deg,#6b9e7d,${gold})`,
                              borderRadius: '3px',
                              transition: 'width .3s',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )
        })()}

        <div style={cardStyle}>
          <h3 style={{ fontSize: '15px', fontWeight: 500, color: text, marginBottom: '16px' }}>Prihod po usluzi</h3>
          {topUsluge.length === 0 ? (
            <p style={{ fontSize: '13px', color: muted }}>Nema potvrđenih termina sa uslugom u ovom periodu.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topUsluge.map((u, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: text }}>{u.naziv} <span style={{ color: muted, fontSize: '11px' }}>({u.count}x)</span></span>
                    <span style={{ fontSize: '13px', color: gold, fontWeight: 500 }}>{u.prihod.toLocaleString()} RSD</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(u.prihod / maxPrihod) * 100}%`, background: `linear-gradient(90deg,${gold},#b8960c)`, borderRadius: '3px', transition: 'width .3s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: text }}>Rashodi</h3>
            <button type="button" style={{ ...btnGold, padding: '8px 14px', fontSize: '12px' }}
              onClick={() => { setShowNoviRashod(true); setRashodGreska('') }}>
              + Dodaj rashod
            </button>
          </div>

          {showNoviRashod && (
            <div style={{ background: 'rgba(255,255,255,.03)', border: `0.5px solid ${goldBorder}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 500, color: text, marginBottom: '12px' }}>Novi rashod</h4>
              {rashodGreska && (
                <div role="alert" style={{ background: 'rgba(220,50,50,.1)', border: '0.5px solid rgba(220,50,50,.3)', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px', fontSize: '12px', color: '#ff6b6b' }}>
                  {rashodGreska}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '12px', marginBottom: '14px' }}>
                <div><label style={labelStyle}>NAZIV</label><input style={inputStyle} placeholder="Zakup prostora" value={noviRashod.naziv} onChange={e => setNoviRashod({ ...noviRashod, naziv: e.target.value })} /></div>
                <div><label style={labelStyle}>IZNOS (RSD)</label><input style={inputStyle} placeholder="25000" value={noviRashod.iznos} onChange={e => setNoviRashod({ ...noviRashod, iznos: e.target.value })} /></div>
                <div>
                  <label style={labelStyle}>KATEGORIJA</label>
                  <select style={inputStyle} value={noviRashod.kategorija} onChange={e => setNoviRashod({ ...noviRashod, kategorija: e.target.value })}>
                    {['Zakup', 'Plate', 'Materijal', 'Komunalije', 'Marketing', 'Oprema', 'Ostalo'].map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>DATUM</label><input style={inputStyle} type="date" value={noviRashod.datum} onChange={e => setNoviRashod({ ...noviRashod, datum: e.target.value })} /></div>
                <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>NAPOMENA (opciono)</label><input style={inputStyle} placeholder="Npr. rata za maj" value={noviRashod.napomena} onChange={e => setNoviRashod({ ...noviRashod, napomena: e.target.value })} /></div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" style={btnGold} onClick={() => void dodajRashod()}>Dodaj</button>
                <button type="button" style={btnOutline} onClick={() => { setShowNoviRashod(false); setRashodGreska('') }}>Odustani</button>
              </div>
            </div>
          )}

          {topKategorije.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: muted, marginBottom: '10px' }}>Rashodi po kategoriji</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topKategorije.map(([kat, izn]) => (
                  <div key={kat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: text }}>{kat}</span>
                      <span style={{ fontSize: '13px', color: '#e07a7a', fontWeight: 500 }}>{izn.toLocaleString()} RSD</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(izn / maxRashod) * 100}%`, background: 'linear-gradient(90deg,#e07a7a,#c04040)', borderRadius: '3px', transition: 'width .3s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relevantRashodi.length === 0 ? (
            <p style={{ fontSize: '13px', color: muted }}>Nema rashoda za ovaj period. Dodajte prvi rashod iznad.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {relevantRashodi.slice(0, 20).map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', border: `0.5px solid ${goldBorder}`, borderRadius: '12px', background: 'rgba(255,255,255,.018)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 200px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(220,80,80,.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>💸</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: text }}>{r.naziv}</div>
                      <div style={{ fontSize: '11px', color: muted }}>{r.kategorija} · {new Date(r.datum + 'T12:00:00').toLocaleDateString('sr-Latn-RS')}</div>
                      {r.napomena && <div style={{ fontSize: '11px', color: 'rgba(245,240,232,.3)', marginTop: '2px' }}>{r.napomena}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#e07a7a' }}>{Number(r.iznos).toLocaleString()} RSD</span>
                    <button type="button" style={btnOutline} onClick={() => void obrisiRashod(r.id)}>Obriši</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {analitikaKlijentDetaljKljuc !== null ? (
          <div
            role="presentation"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2000,
              background: 'rgba(0,0,0,.72)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setAnalitikaKlijentDetaljKljuc(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="analitika-klijent-naslov"
              style={{
                width: '100%',
                maxWidth: '520px',
                maxHeight: 'min(85vh, 640px)',
                overflow: 'auto',
                background: '#111',
                border: `0.5px solid ${goldBorder}`,
                borderRadius: '16px',
                padding: '22px 20px',
                boxShadow: '0 24px 60px rgba(0,0,0,.55)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <h3 id="analitika-klijent-naslov" style={{ fontSize: '17px', fontWeight: 600, color: text }}>
                    {klijentModalIme}
                  </h3>
                  {klijentModalTel ? (
                    <div style={{ fontSize: '12px', color: muted, marginTop: '4px' }}>Tel. {klijentModalTel}</div>
                  ) : null}
                </div>
                <button type="button" style={{ ...btnOutline, padding: '8px 12px', fontSize: '12px' }} onClick={() => setAnalitikaKlijentDetaljKljuc(null)}>
                  Zatvori
                </button>
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: text,
                  marginBottom: '16px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: goldFaint,
                  border: `0.5px solid ${goldBorder}`,
                }}
              >
                U izabranom periodu: <strong style={{ color: gold }}>{klijentModalTermini.length}</strong>{' '}
                {klijentModalTermini.length === 1 ? 'termin' : 'termina'} · ukupno potrošeno{' '}
                <strong style={{ color: gold }}>{klijentModalUkupno.toLocaleString('sr-Latn-RS')} RSD</strong>
              </div>
              {klijentModalTermini.length === 0 ? (
                <p style={{ fontSize: '13px', color: muted }}>Nema termina za ovog klijenta u ovom periodu.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ color: muted, textAlign: 'left' }}>
                      <th style={{ padding: '8px 6px', fontWeight: 500 }}>Datum i vreme</th>
                      <th style={{ padding: '8px 6px', fontWeight: 500 }}>Usluga</th>
                      <th style={{ padding: '8px 6px', fontWeight: 500, textAlign: 'right', width: '96px' }}>Iznos</th>
                      <th style={{ padding: '8px 6px', fontWeight: 500, width: '88px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {klijentModalTermini.map((t) => {
                      const c = prometTerminaUSalonu(t, uslugeMap)
                      const naz = t.usluge?.naziv || (t.usluga_id ? uslugeMap.get(t.usluga_id)?.naziv : null) || '—'
                      return (
                        <tr key={t.id} style={{ borderTop: '0.5px solid rgba(255,255,255,.08)' }}>
                          <td style={{ padding: '10px 6px', color: text, whiteSpace: 'nowrap' }}>
                            {formatDatumBelgrad(t.datum_vrijeme)} · {formatVremeBelgrad(t.datum_vrijeme)}
                          </td>
                          <td style={{ padding: '10px 6px', color: muted }}>{naz}</td>
                          <td style={{ padding: '10px 6px', textAlign: 'right', color: gold, fontWeight: 500 }}>{c.toLocaleString('sr-Latn-RS')} RSD</td>
                          <td style={{ padding: '10px 6px', color: muted }}>{t.status || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: `0.5px solid ${goldBorder}` }}>
                      <td colSpan={2} style={{ padding: '10px 6px', fontWeight: 600, color: text }}>
                        Ukupno
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: gold }}>
                        {klijentModalUkupno.toLocaleString('sr-Latn-RS')} RSD
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const renderLojalnost = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {sauvano === 'lojalnost' && (
        <div style={{ background: 'rgba(50,200,100,.1)', border: '0.5px solid rgba(50,200,100,.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#4caf81' }}>
          ✓ Program lojalnosti je sačuvan!
        </div>
      )}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 500, color: text }}>Program lojalnosti</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: muted }}>{lojalnost?.aktivan ? 'Aktivan' : 'Neaktivan'}</span>
            <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: lojalnost?.aktivan ? `linear-gradient(135deg,${gold},#b8960c)` : 'rgba(255,255,255,.1)', cursor: 'pointer', position: 'relative', transition: 'all .3s' }}
              onClick={() => setLojalnost({ ...lojalnost, aktivan: !lojalnost?.aktivan })}>
              <div style={{ position: 'absolute', top: '3px', left: lojalnost?.aktivan ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left .3s' }} />
            </div>
          </div>
        </div>
        <p style={{ fontSize: '12px', color: muted, lineHeight: 1.55, marginBottom: '18px' }}>
          Kupac jednim nalogom može ići kod više salona; kod vas se lojalnost računa samo za termine ovde — u drugom salonu ima poseban brojač.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle}>TIP NAGRADE</label>
            <select style={inputStyle} value={lojalnost?.tip} onChange={e => setLojalnost({ ...lojalnost, tip: e.target.value })}>
              <option value="popust">Popust (%)</option>
              <option value="vaučer">Vaučer (RSD)</option>
              <option value="besplatna">Besplatna usluga</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>{lojalnost?.tip === 'popust' ? 'POPUST (%)' : lojalnost?.tip === 'vaučer' ? 'VRIJEDNOST (RSD)' : 'NAZIV USLUGE'}</label>
            <input style={inputStyle} value={lojalnost?.vrijednost}
              onChange={e => setLojalnost({ ...lojalnost, vrijednost: parseInt(e.target.value) || 0 })}
              placeholder={lojalnost?.tip === 'popust' ? '20' : '500'} />
          </div>
          <div>
            <label style={labelStyle}>SVAKI KOJI DOLAZAK</label>
            <input style={inputStyle} type="number" min="2" max="20" value={lojalnost?.svaki_koji}
              onChange={e => setLojalnost({ ...lojalnost, svaki_koji: parseInt(e.target.value) || 5 })} />
          </div>
        </div>
        <div style={{ background: goldFaint, border: `0.5px solid ${goldBorder}`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: muted, marginBottom: '6px' }}>PREGLED PROGRAMA</div>
          <div style={{ fontSize: '15px', color: gold, fontWeight: 500 }}>
            Svaki {lojalnost?.svaki_koji}. dolazak → {lojalnost?.tip === 'popust' ? `${lojalnost?.vrijednost}% popusta` : lojalnost?.tip === 'vaučer' ? `vaučer ${lojalnost?.vrijednost} RSD` : 'besplatna usluga'}
          </div>
        </div>
        <button style={{ ...btnGold, padding: '14px', borderRadius: '12px', fontSize: '14px', width: '100%' }} onClick={sacuvajLojalnost}>
          Sačuvaj program lojalnosti ✓
        </button>
      </div>
      <div
        style={{
          ...cardStyle,
          border: '0.5px solid rgba(200,80,80,.35)',
          background: crnaLista.length > 0 ? 'rgba(200,40,40,.06)' : 'rgba(255,255,255,.02)',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 500, color: crnaLista.length > 0 ? '#e8a0a0' : text, marginBottom: '10px' }}>
          Crna lista kupaca
        </h3>
        <p style={{ fontSize: '12px', color: muted, marginBottom: '14px', lineHeight: 1.55 }}>
          Prikaz je isti za sve salone u aplikaciji. Zakazivanje je blokirano za brojeve na listi. Ručno možete dodati samo klijenta koji je već kod vas u bazi (isti telefon kao kod zakazivanja).
        </p>
        <div style={{ marginBottom: '18px', paddingBottom: '18px', borderBottom: '0.5px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: text, marginBottom: '10px' }}>Dodaj svog klijenta ručno</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>TELEFON</label>
              <input
                style={inputStyle}
                placeholder="npr. 064 123 4567"
                value={crnaRučnoTelefon}
                onChange={(e) => { setCrnaRučnoTelefon(e.target.value); setCrnaRučnoGreska('') }}
              />
            </div>
            <div>
              <label style={labelStyle}>IME (opciono)</label>
              <input
                style={inputStyle}
                placeholder="Marko Marković"
                value={crnaRučnoIme}
                onChange={(e) => { setCrnaRučnoIme(e.target.value); setCrnaRučnoGreska('') }}
              />
            </div>
          </div>
          {crnaRučnoGreska ? (
            <p style={{ fontSize: '12px', color: '#ff8a8a', marginBottom: '10px' }}>{crnaRučnoGreska}</p>
          ) : null}
          <button
            type="button"
            style={{ ...btnGold, padding: '12px 18px', fontSize: '13px' }}
            disabled={crnaRučnoLoading}
            onClick={() => void dodajNaCrnuListu()}
          >
            {crnaRučnoLoading ? 'Dodavanje…' : 'Dodaj na crnu listu'}
          </button>
        </div>
        {crnaLista.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'rgba(245,240,232,.35)', fontStyle: 'italic' }}>Trenutno nema unosa na crnoj listi.</p>
        ) : (
          crnaLista.map((r, idx) => (
            <div
              key={r.id}
              style={{
                padding: '12px 0',
                borderBottom: idx < crnaLista.length - 1 ? '0.5px solid rgba(255,255,255,.06)' : 'none',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 500, color: text }}>{r.ime || '—'}</div>
              <div style={{ fontSize: '12px', color: muted }}>{r.telefon}</div>
              <div style={{ fontSize: '11px', color: 'rgba(245,240,232,.32)', marginTop: '4px' }}>
                {r.razlog === 'salon_rucno'
                  ? `Ručno · ${r.saloni?.naziv?.trim() || 'Nepoznat salon'}`
                  : r.razlog === 'kasno_otkazivanje'
                    ? `Kasno otkazivanje${r.saloni?.naziv ? ` · ${r.saloni.naziv}` : ''}`
                    : r.razlog}
                {' · '}
                {new Date(r.created_at).toLocaleString('sr')}
                {typeof r.minuta_pre_otkazivanja === 'number' ? ` · ~${r.minuta_pre_otkazivanja} min pre termina` : ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const sections: Record<string, () => React.ReactElement> = {
    pregled: renderPregled, analitika: renderAnalitika, profil: renderProfil, usluge: renderUsluge,
    zaposleni: renderZaposleni, lager: renderLager, termini: renderTermini, stranica: renderStranica, lojalnost: renderLojalnost
  }

  // Ako nije autentifikovan - loading screen
  if (!autentifikovan || ucitavanje) return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '2px solid rgba(212,175,55,.2)', borderTop: '2px solid #d4af37', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'rgba(245,240,232,.4)', fontFamily: 'sans-serif', fontSize: '14px' }}>Učitavanje...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#f5f0e8', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box;margin:0;padding:0}
        input,select,textarea{outline:none;font-family:sans-serif;color:#f5f0e8}
        input:focus,select:focus,textarea:focus{border-color:rgba(212,175,55,.6)!important}
        select option{background:#1a1a1a;color:#f5f0e8}
        .nav-item{cursor:pointer;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;transition:all .2s;font-size:14px;color:rgba(245,240,232,.5);border:0.5px solid transparent}
        .nav-item:hover{background:rgba(212,175,55,.06);color:rgba(245,240,232,.8)}
        .nav-item.active{background:rgba(212,175,55,.12);color:#d4af37;border-color:rgba(212,175,55,.2)}
        .tab-item{cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;flex:1;font-size:9px;color:rgba(245,240,232,.4);transition:color .2s;text-align:center}
        .tab-item.active{color:#d4af37}
        @media(min-width:769px){.mobile-tabs{display:none!important}}
        @media(max-width:768px){
          .sidebar{display:none!important}
          .mobile-tabs{display:flex!important}
          .dash-content{padding:16px!important;padding-bottom:90px!important}
        }
      `}</style>

      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '0.5px solid rgba(212,175,55,.2)', background: 'rgba(10,10,10,.97)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontSize: '20px', fontWeight: 500, background: 'linear-gradient(90deg,#d4af37,#f5e17a,#d4af37)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s linear infinite', textDecoration: 'none' }}>
          SalonPro
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div ref={notifMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              aria-expanded={notifMenuOpen}
              aria-haspopup="true"
              aria-label="Obaveštenja"
              onClick={() => setNotifMenuOpen((o) => !o)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: `0.5px solid ${goldBorder}`,
                background: notifMenuOpen ? 'rgba(212,175,55,.12)' : '#111',
                color: text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
              }}
              title="Obaveštenja"
            >
              🔔
              {zvonacBroj > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '9px',
                    background: '#d4af37',
                    color: '#0a0a0a',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}
                >
                  {zvonacBroj > 99 ? '99+' : zvonacBroj}
                </span>
              )}
            </button>
            {notifMenuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 'min(360px, calc(100vw - 32px))',
                  maxHeight: 'min(420px, 70vh)',
                  overflowY: 'auto',
                  background: '#141414',
                  border: `0.5px solid ${goldBorder}`,
                  borderRadius: '14px',
                  boxShadow: '0 16px 48px rgba(0,0,0,.55)',
                  zIndex: 200,
                  padding: '12px 0',
                }}
              >
                <div style={{ padding: '0 14px 10px', borderBottom: '0.5px solid rgba(255,255,255,.08)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: text }}>Obaveštenja</div>
                  <div style={{ fontSize: '11px', color: muted, marginTop: '4px' }}>
                    Prikazana su samo nepročitana obaveštenja. Označite ih kao pročitana kada ih pregledate.
                  </div>
                </div>
                {salonNotifications.length === 0 ? (
                  <div style={{ padding: '16px 14px', fontSize: '13px', color: muted }}>Nema nepročitanih obaveštenja salona.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {obavestenjaVidljivaUMeniju.map((n, idx) => (
                      <div
                        key={n.id}
                        role="menuitem"
                        style={{
                          padding: '12px 14px',
                          borderBottom:
                            idx < obavestenjaVidljivaUMeniju.length - 1 ? '0.5px solid rgba(255,255,255,.06)' : 'none',
                        }}
                      >
                        <div style={{ fontSize: '13px', color: text, fontWeight: 600 }}>{n.title}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(245,240,232,.72)', lineHeight: 1.5, marginTop: '4px' }}>
                          {skratiNotifTekst(n.body, 200)}
                        </div>
                        <div style={{ fontSize: '11px', color: muted, marginTop: '6px' }}>
                          {new Date(n.created_at).toLocaleString('sr-Latn-RS')}
                        </div>
                        <button
                          type="button"
                          onClick={() => void oznaciSalonNotifikacijuProcitanom(n.id)}
                          style={{
                            ...btnOutline,
                            marginTop: '10px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            color: gold,
                            borderColor: 'rgba(212,175,55,.35)',
                          }}
                        >
                          Pročitano
                        </button>
                      </div>
                    ))}
                    {starijeSalonNotifikacije.length > 0 && !notifStarijeOtvoreno && (
                      <div style={{ padding: '8px 14px 12px' }}>
                        <button
                          type="button"
                          onClick={() => setNotifStarijeOtvoreno(true)}
                          style={{
                            ...btnOutline,
                            width: '100%',
                            padding: '10px 12px',
                            textAlign: 'center',
                            color: gold,
                            fontSize: '12px',
                          }}
                        >
                          Pogledaj više ({starijeSalonNotifikacije.length})
                        </button>
                      </div>
                    )}
                    {notifStarijeOtvoreno && starijeSalonNotifikacije.length > 0 && (
                      <div style={{ padding: '4px 14px 12px' }}>
                        <button
                          type="button"
                          onClick={() => setNotifStarijeOtvoreno(false)}
                          style={{ ...btnOutline, width: '100%', padding: '8px 12px', fontSize: '12px' }}
                        >
                          Sakrij starije
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {neprocitaniTermini > 0 && (
                  <div style={{ padding: '10px 14px 4px', borderTop: '0.5px solid rgba(255,255,255,.08)' }}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setNotifMenuOpen(false)
                        setAktivan('termini')
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: `0.5px solid ${goldBorder}`,
                        background: 'rgba(212,175,55,.08)',
                        color: gold,
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'sans-serif',
                      }}
                    >
                      Otvori termine za potvrdu / izmene
                      <span style={{ opacity: 0.85, fontWeight: 700, marginLeft: 6 }}>({neprocitaniTermini})</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {profil.logo && (
            // eslint-disable-next-line @next/next/no-img-element -- mali logo u headeru
            <img src={profil.logo} alt="logo" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <span style={{ fontSize: '13px', color: muted }}>{salon?.naziv}</span>
          <div style={{ width: '36px', height: '36px', background: `linear-gradient(135deg,${gold},#b8960c)`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#0a0a0a', cursor: 'pointer', flexShrink: 0 }}>
            {salon?.naziv?.charAt(0)}
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside className="sidebar" style={{ width: '220px', borderRight: '0.5px solid rgba(212,175,55,.15)', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '4px', position: 'sticky', top: '57px', height: 'calc(100vh - 57px)', overflowY: 'auto', flexShrink: 0 }}>
          {navItems.map(item => (
            <div key={item.id} className={`nav-item${aktivan === item.id ? ' active' : ''}`} onClick={() => setAktivan(item.id)}>
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(212,175,55,.06)', border: '0.5px solid rgba(212,175,55,.15)', marginTop: '12px' }}>
            <div style={{ fontSize: '11px', color: muted, marginBottom: '4px' }}>PLAN</div>
            <div style={{ fontSize: '13px', color: gold, fontWeight: 500 }}>Pro · 29,99 €/mes</div>
          </div>
          <button onClick={handleOdjava} style={{ background: 'none', border: 'none', color: muted, fontSize: '12px', cursor: 'pointer', padding: '10px', marginTop: '8px', fontFamily: 'sans-serif' }}>
            Odjavi se
          </button>
        </aside>

        <main className="dash-content" style={{ flex: 1, padding: '28px', overflowY: 'auto', paddingBottom: '80px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 500, color: text, marginBottom: '4px' }}>
              {navItems.find(n => n.id === aktivan)?.icon} {navItems.find(n => n.id === aktivan)?.label}
            </h1>
            <p style={{ fontSize: '13px', color: muted }}>{salon?.naziv} · {formatSalonTipZaPrikaz(salon?.tip)}</p>
          </div>
          {sections[aktivan]?.()}
        </main>
      </div>

      <div className="mobile-tabs" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111', borderTop: '0.5px solid rgba(212,175,55,.2)', zIndex: 100, padding: '4px 0' }}>
        {navItems.map(item => (
          <div key={item.id} className={`tab-item${aktivan === item.id ? ' active' : ''}`} onClick={() => setAktivan(item.id)}>
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}