import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { isValidUuid } from '@/lib/is-valid-uuid'
import { rateLimitByIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function getAnonSupabaseClient() {
  const { url, anonKey, ok } = getPublicSupabaseEnv()
  if (!ok) return null
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function normalizePredloziRpc(data: unknown): string[] {
  if (data == null) return []
  if (Array.isArray(data)) {
    return data.map((x) => String(x)).filter(Boolean)
  }
  if (typeof data === 'string') {
    try {
      const j = JSON.parse(data) as unknown
      return Array.isArray(j) ? j.map((x) => String(x)).filter(Boolean) : []
    } catch {
      return []
    }
  }
  return []
}

/** GET: slobodni počeci termina (ISO UTC) za izabrani kalendar dan u Srbiji. */
export async function GET(request: Request) {
  const rl = rateLimitByIp(request, 'termini_slobodni_get', { maxRequests: 90, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Previše zahteva. Sačekajte malo.' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const salonId = searchParams.get('salon_id') ?? ''
  const uslugaId = searchParams.get('usluga_id') ?? ''
  const datum = searchParams.get('datum') ?? ''
  const zaposleniIdRaw = searchParams.get('zaposleni_id')
  const excludeTerminId = searchParams.get('exclude_termin_id')
  const limitRaw = searchParams.get('limit')
  const limit = Math.min(80, Math.max(1, Number.parseInt(limitRaw || '48', 10) || 48))

  if (!isValidUuid(salonId) || !isValidUuid(uslugaId)) {
    return NextResponse.json({ error: 'Nedostaju ili nisu ispravni salon_id / usluga_id.' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return NextResponse.json({ error: 'Nedostaje ili nije ispravan datum (YYYY-MM-DD).' }, { status: 400 })
  }

  const zaposleniId =
    zaposleniIdRaw && zaposleniIdRaw.trim() && isValidUuid(zaposleniIdRaw.trim()) ? zaposleniIdRaw.trim() : null
  const excludeId =
    excludeTerminId && excludeTerminId.trim() && isValidUuid(excludeTerminId.trim())
      ? excludeTerminId.trim()
      : null

  const anon = getAnonSupabaseClient()
  if (!anon) {
    return NextResponse.json({ error: 'Server nije konfigurisan (Supabase).' }, { status: 500 })
  }

  const { count, error: cntErr } = await anon
    .from('zaposleni')
    .select('id', { count: 'exact', head: true })
    .eq('salon_id', salonId)
    .eq('aktivan', true)

  if (cntErr) {
    console.error('[termini/slobodni] count zaposleni:', cntErr.message)
    return NextResponse.json({ error: 'Greška pri proveri zaposlenih.' }, { status: 500 })
  }

  const nZap = count ?? 0
  if (nZap > 1 && !zaposleniId) {
    return NextResponse.json({ error: 'Izaberite zaposlenog za prikaz slobodnih termina.' }, { status: 400 })
  }

  const { data, error } = await anon.rpc('predlozi_slobodne_slotove', {
    p_salon_id: salonId,
    p_usluga_id: uslugaId,
    p_zaposleni_id: zaposleniId,
    p_dan: datum,
    p_limit: limit,
    p_exclude_termin_id: excludeId,
  })

  if (error) {
    const missingFn = /function .* does not exist|Could not find the function/i.test(error.message)
    console.error('[termini/slobodni] RPC:', error.message)
    return NextResponse.json(
      {
        error: missingFn
          ? 'Baza nije ažurirana (nedostaje funkcija predlozi_slobodne_slotove). Pokrenite migracije.'
          : 'Nije moguće učitati slobodne termine.',
      },
      { status: missingFn ? 503 : 500 },
    )
  }

  const slotovi_iso = normalizePredloziRpc(data)
  return NextResponse.json({ slotovi_iso })
}
