import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSalonAdminEmail, sendTransactionalEmail } from '@/lib/email/salon-admin-notify'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { getServerSupabaseClient } from '@/lib/server-supabase'
import { storageTerminStatus } from '@/lib/termin-status'
import { sendMulticastNotification } from '@/lib/notifications/firebase-config'
import {
  formatDatumVrijemeBelgrad,
  naivniBelgradDatumVremeUUtcIso,
} from '@/lib/termin-belgrade-vreme'

export const dynamic = 'force-dynamic'

/** PostgREST / supabase-js ponekad vraća skalar kao string, a ponekad ugnježđeno. */
function unwrapRpcText(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'string') return raw.length > 0 ? raw : null
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null
    const first = raw[0]
    if (typeof first === 'string') return first.length > 0 ? first : null
    if (first !== null && typeof first === 'object') return unwrapRpcText(first)
  }
  if (typeof raw === 'object') {
    for (const v of Object.values(raw as Record<string, unknown>)) {
      const inner = unwrapRpcText(v)
      if (inner) return inner
    }
  }
  return null
}

function isMissingRpcFunction(message: string): boolean {
  return /function .* does not exist|Could not find the function/i.test(message)
}

function classifyTerminPoslovnaGreška(msg: string): 'radno' | 'preklapanje' | null {
  if (/RADNO_VREME/i.test(msg)) return 'radno'
  if (/SLOT_ZAUZET/i.test(msg)) return 'preklapanje'
  return null
}

async function pronadjiZauzeteTermine(
  supabase: ReturnType<typeof createClient>,
  salon_id: string,
  datumStr: string,
  zaposleni_id: string | null,
): Promise<string[]> {
  try {
    const datum = datumStr.split('T')[0]
    const dayStart = datum + 'T00:00:00.000Z'
    const dayEnd = datum + 'T23:59:59.999Z'

    let query = supabase
      .from('termini')
      .select('datum_vrijeme')
      .eq('salon_id', salon_id)
      .gte('datum_vrijeme', dayStart)
      .lt('datum_vrijeme', dayEnd)
      .not('status', 'in', '("otkazan","nije_dosao")')

    if (zaposleni_id) {
      query = query.eq('zaposleni_id', zaposleni_id)
    }

    const { data: appointments } = await query
    if (!appointments) return []

    const booked = new Set<string>()
    for (const apt of appointments) {
      const d = new Date(apt.datum_vrijeme)
      const bg = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }))
      const h = String(bg.getHours()).padStart(2, '0')
      const m = String(bg.getMinutes()).padStart(2, '0')
      booked.add(`${h}:${m}`)
    }

    return Array.from(booked).sort()
  } catch {
    return []
  }
}

function getAuthHeaderToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) return null
  const token = authHeader.slice(7).trim()
  return token || null
}

function getAnonSupabaseClient() {
  const { url, anonKey, ok } = getPublicSupabaseEnv()
  if (!ok) return null
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function getUserSupabaseClient(authToken: string) {
  const { url, anonKey, ok } = getPublicSupabaseEnv()
  if (!ok) return null
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${authToken}` },
    },
  })
}

async function posaljiEmailNoviTermin(params: {
  salonId: string
  terminId: string | null
  ime: string
  telefon: string
  datumVrijeme: string
  uslugaId: string | null
  napomena: string | null
  klijentEmail: string
}) {
  try {
    const srv = getServerSupabaseClient()
    let salonNaziv = 'Salon'
    let uslugaNaziv: string | null = null
    if (srv) {
      const { data: sal } = await srv.from('saloni').select('naziv').eq('id', params.salonId).maybeSingle()
      if (sal?.naziv) salonNaziv = String(sal.naziv)
      if (params.uslugaId) {
        const { data: us } = await srv
          .from('usluge')
          .select('naziv')
          .eq('id', params.uslugaId)
          .eq('salon_id', params.salonId)
          .maybeSingle()
        if (us?.naziv) uslugaNaziv = String(us.naziv)
      }
    }
    const when = formatDatumVrijemeBelgrad(params.datumVrijeme)
    const redovi = [
      'Novi zakazan termin.',
      '',
      `Salon: ${salonNaziv}`,
      `Klijent: ${params.ime}`,
      `Telefon: ${params.telefon}`,
      ...(params.klijentEmail ? [`Email klijenta: ${params.klijentEmail}`] : []),
      ...(uslugaNaziv ? [`Usluga: ${uslugaNaziv}`] : []),
      `Datum i vreme: ${when}`,
      ...(params.napomena ? [`Napomena: ${params.napomena}`] : []),
      ...(params.terminId ? [`ID termina: ${params.terminId}`] : []),
      '',
      'Proverite dashboard.',
    ]
    await sendSalonAdminEmail({
      subject: `SalonPro: novi termin — ${salonNaziv}`,
      text: redovi.join('\n'),
    })
  } catch (err) {
    console.error('[termini] Email novi termin:', err)
  }
}

async function posaljiPushNotifikacijuSalonu(params: {
  salonId: string
  ime: string
  datumVrijeme: string
}) {
  try {
    const srv = getServerSupabaseClient()
    if (!srv) return
    const { data: tokens } = await srv.from('device_tokens').select('token').eq('salon_id', params.salonId)
    const deviceTokens = (tokens || []).map(t => t.token).filter(Boolean) as string[]
    if (deviceTokens.length === 0) return
    const when = formatDatumVrijemeBelgrad(params.datumVrijeme)
    await sendMulticastNotification(deviceTokens, 'Novi termin! 📅', `${params.ime} na ${when}`, {
      type: 'new_appointment',
      salon_id: params.salonId,
    })
  } catch (err) {
    console.error('[termini] Push notifikacija:', err)
  }
}

async function posaljiEmailKorisnikuNakonZakazivanja(params: {
  toEmail: string
  salonId: string
  datumVrijeme: string
  ime: string
  uslugaId: string | null
}) {
  const to = params.toEmail.trim()
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return
  try {
    const srv = getServerSupabaseClient()
    let salonNaziv = 'Salon'
    let uslugaNaziv: string | null = null
    if (srv) {
      const { data: sal } = await srv.from('saloni').select('naziv').eq('id', params.salonId).maybeSingle()
      if (sal?.naziv) salonNaziv = String(sal.naziv)
      if (params.uslugaId) {
        const { data: us } = await srv
          .from('usluge')
          .select('naziv')
          .eq('id', params.uslugaId)
          .eq('salon_id', params.salonId)
          .maybeSingle()
        if (us?.naziv) uslugaNaziv = String(us.naziv)
      }
    }
    const when = formatDatumVrijemeBelgrad(params.datumVrijeme)
    const text = [
      `Poštovani/a ${params.ime},`,
      '',
      'Primili smo vaš zahtev za termin.',
      '',
      `Salon: ${salonNaziv}`,
      ...(uslugaNaziv ? [`Usluga: ${uslugaNaziv}`] : []),
      `Datum i vreme: ${when}`,
      '',
      'Kada salon potvrdi termin, dobićete još jednu poruku na ovu adresu.',
      '',
      '— SalonPro',
    ].join('\n')
    await sendTransactionalEmail({
      to,
      subject: `SalonPro: zahtev za termin — ${salonNaziv}`,
      text,
    })
  } catch (err) {
    console.error('[termini] Email korisniku (zakazivanje):', err)
  }
}

export async function POST(request: Request) {
  try {
    const anonClient = getAnonSupabaseClient()
    if (!anonClient) {
      return NextResponse.json(
        { error: 'Server nije konfigurisan: nedostaje Supabase URL ili API key.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { salon_id, usluga_id, zaposleni_id, ime_klijenta, telefon_klijenta, datum_vrijeme, napomena, email } = body

    if (!salon_id || !ime_klijenta || !telefon_klijenta || !datum_vrijeme) {
      return NextResponse.json({ error: 'Nedostaju obavezni podaci' }, { status: 400 })
    }

    const imeKlijenta = String(ime_klijenta).trim()
    const telefonKlijenta = String(telefon_klijenta).trim()

    const authToken = getAuthHeaderToken(request)
    if (!authToken) {
      return NextResponse.json(
        { error: 'Za zakazivanje termina morate biti prijavljeni kao kupac.' },
        { status: 401 }
      )
    }

    const { data: userRes, error: userErr } = await anonClient.auth.getUser(authToken)
    const authUserId = userRes.user?.id ?? null
    if (userErr || !authUserId) {
      return NextResponse.json(
        { error: 'Sesija kupca nije važeća. Prijavite se ponovo.' },
        { status: 401 }
      )
    }

    const userClient = getUserSupabaseClient(authToken)
    if (!userClient) {
      return NextResponse.json(
        { error: 'Server nije konfigurisan: nedostaje Supabase URL ili API key.' },
        { status: 500 }
      )
    }

    const { data: blockedPhone, error: rpcPhoneErr } = await userClient.rpc('je_telefon_blokiran', {
      p_telefon: telefonKlijenta,
    })
    if (!rpcPhoneErr && blockedPhone === true) {
      return NextResponse.json(
        { error: 'Zakazivanje nije moguće: ovaj broj telefona je na crnoj listi.' },
        { status: 403 }
      )
    }

    const { data: blockedAuth, error: rpcAuthErr } = await userClient.rpc('je_auth_blokiran', {
      p_uid: authUserId,
    })
    if (!rpcAuthErr && blockedAuth === true) {
      return NextResponse.json(
        { error: 'Zakazivanje nije moguće: vaš nalog je na crnoj listi.' },
        { status: 403 }
      )
    }

    const { data: clientIdRaw, error: clientRpcError } = await userClient.rpc('link_salon_client', {
      p_salon_id: salon_id,
      p_telefon: telefonKlijenta,
      p_ime: imeKlijenta,
      p_email: typeof email === 'string' && email.trim() ? email.trim() : userRes.user.email || '',
    })

    if (clientRpcError) {
      const missingFn = /function .* does not exist|Could not find the function/i.test(clientRpcError.message)
      console.error('[termini] link_salon_client RPC error:', clientRpcError.message)
      return NextResponse.json(
        {
          error: missingFn
            ? 'Baza nije ažurirana. Kontaktirajte administratora.'
            : 'Povezivanje kupca sa salonom nije uspelo.',
        },
        { status: 500 }
      )
    }

    const clientId = typeof clientIdRaw === 'string' ? clientIdRaw : null
    if (!clientId) {
      return NextResponse.json({ error: 'Neuspešno povezivanje kupca sa salonom.' }, { status: 500 })
    }

    const uslugaIdZaObavestenje =
      usluga_id && String(usluga_id).trim() ? String(usluga_id).trim() : null
    const klijentEmailZaObavestenje =
      (typeof email === 'string' && email.trim() ? email.trim() : userRes.user.email || '') || ''
    const napomenaZaMail =
      typeof napomena === 'string' && napomena.trim() ? napomena.trim() : null
    const datumVrijemeStr =
      naivniBelgradDatumVremeUUtcIso(String(datum_vrijeme).trim()) ?? String(datum_vrijeme).trim()

    const bookingPayload = {
      p_salon_id: salon_id,
      p_client_id: clientId,
      p_usluga_id: usluga_id || null,
      p_zaposleni_id: zaposleni_id || null,
      p_ime: imeKlijenta,
      p_telefon: telefonKlijenta,
      p_datum_vrijeme: datumVrijemeStr,
      p_napomena: napomena || null,
    }
    const { data: rpcBookingId, error: bookingRpcError } = await userClient.rpc('create_authenticated_booking', bookingPayload)

    if (!bookingRpcError) {
      const terminIdOut = typeof rpcBookingId === 'string' ? rpcBookingId : null
      void posaljiEmailNoviTermin({
        salonId: String(salon_id),
        terminId: terminIdOut,
        ime: imeKlijenta,
        telefon: telefonKlijenta,
        datumVrijeme: datumVrijemeStr,
        uslugaId: uslugaIdZaObavestenje,
        napomena: napomenaZaMail,
        klijentEmail: klijentEmailZaObavestenje,
      })
      void posaljiEmailKorisnikuNakonZakazivanja({
        toEmail: klijentEmailZaObavestenje,
        salonId: String(salon_id),
        datumVrijeme: datumVrijemeStr,
        ime: imeKlijenta,
        uslugaId: uslugaIdZaObavestenje,
      })
      void posaljiPushNotifikacijuSalonu({
        salonId: String(salon_id),
        ime: imeKlijenta,
        datumVrijeme: datumVrijemeStr,
      })
      return NextResponse.json({ success: true, termin_id: terminIdOut })
    }

    const biz = classifyTerminPoslovnaGreška(bookingRpcError.message)
    if (biz === 'radno') {
      return NextResponse.json(
        { error: 'Salon ne radi u izabrano vreme ili je zatvoren tog dana. Izaberite drugi termin.' },
        { status: 409 }
      )
    }
    if (biz === 'preklapanje') {
      const zauzeti = await pronadjiZauzeteTermine(
        userClient, String(salon_id), String(datum_vrijeme), zaposleni_id ? String(zaposleni_id) : null,
      )
      return NextResponse.json(
        {
          error: 'Željeni termin je zauzet. Slobodni termini su oni koji nisu na spisku ispod.',
          zauzeti_termini: zauzeti,
        },
        { status: 409 }
      )
    }

    if (isMissingRpcFunction(bookingRpcError.message) && !zaposleni_id) {
      const { data: legacyBookingId, error: legacyBookingError } = await userClient.rpc('create_authenticated_booking', {
        p_salon_id: salon_id,
        p_client_id: clientId,
        p_usluga_id: usluga_id || null,
        p_ime: imeKlijenta,
        p_telefon: telefonKlijenta,
        p_datum_vrijeme: datumVrijemeStr,
        p_napomena: napomena || null,
      })
      if (!legacyBookingError) {
        const terminIdOut = typeof legacyBookingId === 'string' ? legacyBookingId : null
        void posaljiEmailNoviTermin({
          salonId: String(salon_id),
          terminId: terminIdOut,
          ime: imeKlijenta,
          telefon: telefonKlijenta,
          datumVrijeme: datumVrijemeStr,
          uslugaId: uslugaIdZaObavestenje,
          napomena: napomenaZaMail,
          klijentEmail: klijentEmailZaObavestenje,
        })
        void posaljiEmailKorisnikuNakonZakazivanja({
          toEmail: klijentEmailZaObavestenje,
          salonId: String(salon_id),
          datumVrijeme: datumVrijemeStr,
          ime: imeKlijenta,
          uslugaId: uslugaIdZaObavestenje,
        })
        void posaljiPushNotifikacijuSalonu({
          salonId: String(salon_id),
          ime: imeKlijenta,
          datumVrijeme: datumVrijemeStr,
        })
        return NextResponse.json({ success: true, termin_id: terminIdOut })
      }
      const legacyBiz = classifyTerminPoslovnaGreška(legacyBookingError.message)
      if (legacyBiz === 'radno') {
        return NextResponse.json(
          { error: 'Salon ne radi u izabrano vreme ili je zatvoren tog dana. Izaberite drugi termin.' },
          { status: 409 }
        )
      }
      if (legacyBiz === 'preklapanje') {
        const zauzeti = await pronadjiZauzeteTermine(
          userClient, String(salon_id), String(datum_vrijeme), null,
        )
        return NextResponse.json(
          {
            error: 'Željeni termin je zauzet. Slobodni termini su oni koji nisu na spisku ispod.',
            zauzeti_termini: zauzeti,
          },
          { status: 409 }
        )
      }
    }

    console.error('[termini] booking RPC error:', bookingRpcError.message)
    return NextResponse.json(
      {
        error: isMissingRpcFunction(bookingRpcError.message)
          ? 'Baza nije ažurirana. Kontaktirajte administratora.'
          : 'Zakazivanje termina nije uspelo.',
      },
      { status: isMissingRpcFunction(bookingRpcError.message) ? 503 : 500 }
    )
  } catch (error) {
    console.error('[termini] unexpected error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Greška servera.' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const supabase = getAnonSupabaseClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Server nije konfigurisan: nedostaje Supabase URL ili API key.' },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const statusCheck = searchParams.get('status_check')
  const salon_id = searchParams.get('salon_id')

  if (!salon_id) return NextResponse.json({ error: 'Nedostaje salon_id' }, { status: 400 })

  if (statusCheck === '1') {
    const termin_id_raw = searchParams.get('termin_id')
    const ime = searchParams.get('ime')
    const telefon = searchParams.get('telefon')
    const datum_vrijeme = searchParams.get('datum_vrijeme')

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const termin_id = termin_id_raw && uuidRe.test(termin_id_raw.trim()) ? termin_id_raw.trim() : null

    if (!termin_id && (!ime || !telefon || !datum_vrijeme)) {
      return NextResponse.json({ error: 'Nedostaju podaci za proveru statusa termina.' }, { status: 400 })
    }

    const datumNorm =
      datum_vrijeme && datum_vrijeme.trim()
        ? naivniBelgradDatumVremeUUtcIso(datum_vrijeme.trim()) ?? datum_vrijeme.trim()
        : null

    const { data: rpcStatus, error: rpcErr } = await supabase.rpc('get_public_termin_status', {
      p_salon_id: salon_id,
      p_termin_id: termin_id,
      p_ime: termin_id ? null : ime,
      p_telefon: termin_id ? null : telefon,
      p_datum_vrijeme: termin_id ? null : datumNorm,
    })

    if (rpcErr) {
      const missingFn =
        /get_public_termin_status|does not exist/i.test(rpcErr.message) &&
        /function|Could not find/i.test(rpcErr.message)
      console.error('[termini] get_public_termin_status RPC error:', rpcErr.message)
      return NextResponse.json(
        {
          error: missingFn
            ? 'Baza nije ažurirana. Kontaktirajte administratora.'
            : 'Provera statusa termina nije uspela.',
        },
        { status: missingFn ? 503 : 500 }
      )
    }

    const rawStatus = unwrapRpcText(rpcStatus)
    const status = rawStatus != null ? storageTerminStatus(rawStatus) : null
    return NextResponse.json(
      { status: status ?? null },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    )
  }

  const { data, error } = await supabase
    .from('termini')
    .select('*, usluge(naziv, cijena)')
    .eq('salon_id', salon_id)
    .order('datum_vrijeme', { ascending: true })

  if (error) {
    console.error('[termini] GET query error:', error.message)
    return NextResponse.json({ error: 'Učitavanje termina nije uspelo.' }, { status: 500 })
  }
  return NextResponse.json({ termini: data })
}
