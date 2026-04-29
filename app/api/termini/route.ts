import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { storageTerminStatus } from '@/lib/termin-status'

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
    const { salon_id, usluga_id, ime_klijenta, telefon_klijenta, datum_vrijeme, napomena, email } = body

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
      return NextResponse.json(
        {
          error: missingFn
            ? 'Baza nije ažurirana: pokreni migraciju 2026-04-20_link_salon_client_rpc.sql u Supabase SQL Editor-u.'
            : clientRpcError.message,
        },
        { status: 500 }
      )
    }

    const clientId = typeof clientIdRaw === 'string' ? clientIdRaw : null
    if (!clientId) {
      return NextResponse.json({ error: 'Neuspješno povezivanje klijenta sa salonom.' }, { status: 500 })
    }

    const { data: rpcBookingId, error: bookingRpcError } = await userClient.rpc('create_authenticated_booking', {
      p_salon_id: salon_id,
      p_client_id: clientId,
      p_usluga_id: usluga_id || null,
      p_ime: imeKlijenta,
      p_telefon: telefonKlijenta,
      p_datum_vrijeme: datum_vrijeme,
      p_napomena: napomena || null,
    })

    if (!bookingRpcError) {
      const terminIdOut = typeof rpcBookingId === 'string' ? rpcBookingId : null
      return NextResponse.json({ success: true, termin_id: terminIdOut })
    }

    return NextResponse.json(
      {
        error: isMissingRpcFunction(bookingRpcError.message)
          ? 'Baza nije ažurirana: pokreni migraciju db/migrations/2026-05-05_authenticated_customer_booking.sql u Supabase SQL Editor-u.'
          : bookingRpcError.message,
      },
      { status: isMissingRpcFunction(bookingRpcError.message) ? 503 : 500 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Greška servera'
    return NextResponse.json({ error: message }, { status: 500 })
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
      return NextResponse.json({ error: 'Nedostaju podaci za provjeru statusa termina' }, { status: 400 })
    }

    const { data: rpcStatus, error: rpcErr } = await supabase.rpc('get_public_termin_status', {
      p_salon_id: salon_id,
      p_termin_id: termin_id,
      p_ime: termin_id ? null : ime,
      p_telefon: termin_id ? null : telefon,
      p_datum_vrijeme: termin_id ? null : datum_vrijeme,
    })

    if (rpcErr) {
      const missingFn =
        /get_public_termin_status|does not exist/i.test(rpcErr.message) &&
        /function|Could not find/i.test(rpcErr.message)
      return NextResponse.json(
        {
          error: missingFn
            ? 'Baza: pokreni migraciju db/migrations/2026-04-30_get_public_termin_status_rpc.sql (funkcija get_public_termin_status).'
            : rpcErr.message,
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ termini: data })
}
