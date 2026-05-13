import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { ensureSalonClientForCustomer } from '@/lib/ensure-customer-salon-client'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { SUPABASE_PUBLIC_ENV_MISSING } from '@/lib/supabase-service-role-hint'
import { getServerSupabaseClient, hasServiceRoleKey } from '@/lib/server-supabase'
import { datumKljucBelgrad } from '@/lib/termin-srbija-vrijeme'

function getAnonClient() {
  const { url: supabaseUrl, anonKey: supabaseAnonKey, ok } = getPublicSupabaseEnv()
  if (!ok) return null
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function getUserClient(authToken: string) {
  const { url: supabaseUrl, anonKey: supabaseAnonKey, ok } = getPublicSupabaseEnv()
  if (!ok) return null
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${authToken}` } },
  })
}

function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) return token
  }
  const { searchParams } = new URL(request.url)
  return searchParams.get('auth_token')
}

const MINUTES_WARN = 180
const MINUTES_BLACKLIST = 30

function minutesUntilStart(iso: string): number {
  const start = new Date(iso).getTime()
  return (start - Date.now()) / 60_000
}

function isMissingRpcFunction(message: string): boolean {
  return /function .* does not exist|Could not find the function/i.test(message)
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

function isSlotZauzetDbError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  const c = (err.code || '').toUpperCase()
  return c === 'P0001' || /SLOT_ZAUZET/i.test(err.message || '')
}

type RouteCtx = { params: Promise<{ id: string }> }

/** Otkazivanje termina od strane kupca (bez posledica ≥3h, upozorenje <3h, crna lista za ponavljanje ili ≤30 min). */
export async function DELETE(request: Request, context: RouteCtx) {
  try {
    const { ok: envOk } = getPublicSupabaseEnv()
    if (!envOk) {
      return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
    }

    const terminId = (await context.params).id
    if (!terminId) {
      return NextResponse.json({ error: 'Nedostaje id termina.' }, { status: 400 })
    }

    const authToken = getAuthToken(request)
    const url = new URL(request.url)
    const salonId = url.searchParams.get('salon_id')
    if (!authToken || !salonId) {
      return NextResponse.json({ error: 'Nedostaju auth token ili salon_id.' }, { status: 400 })
    }

    const anonClient = getAnonClient()
    if (!anonClient) {
      return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
    }

    const { data: userData, error: userError } = await anonClient.auth.getUser(authToken)
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Nevažeća sesija.' }, { status: 401 })
    }

    const userClient = getUserClient(authToken)
    if (!userClient) {
      return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
    }

    const ensured = await ensureSalonClientForCustomer(userClient, salonId, userData.user)
    if (!ensured.ok) {
      return NextResponse.json({ error: ensured.error }, { status: ensured.status })
    }
    const clientData = ensured.client

    const { data: cancelledRaw, error: cancelRpcError } = await userClient.rpc('cancel_customer_appointment', {
      p_termin_id: terminId,
      p_salon_id: salonId,
    })

    if (cancelRpcError) {
      if (!isMissingRpcFunction(cancelRpcError.message)) {
        const status = /nije pronađen|nije povezan|ne pripada/i.test(cancelRpcError.message) ? 404 : 500
        return NextResponse.json({ error: cancelRpcError.message }, { status })
      }
    }

    const cancelled = !cancelRpcError ? (cancelledRaw as { status?: string | null; datum_vrijeme?: string | null } | null) : null

    if (cancelled?.status === 'already_cancelled') {
      return NextResponse.json({ success: true, tier: 'already_cancelled', message: 'Termin je već otkazan.' })
    }

    const service = getServerSupabaseClient()
    if (!service) {
      return NextResponse.json({ error: 'Server nije konfigurisan.' }, { status: 500 })
    }

    let datumVrijeme = typeof cancelled?.datum_vrijeme === 'string' ? cancelled.datum_vrijeme : ''
    if (!datumVrijeme) {
      const { data: termin, error: terminError } = await service
        .from('termini')
        .select('id, salon_id, client_id, datum_vrijeme, status')
        .eq('id', terminId)
        .maybeSingle()

      if (terminError) return NextResponse.json({ error: terminError.message }, { status: 500 })
      if (!termin || termin.salon_id !== salonId || termin.client_id !== clientData.id) {
        return NextResponse.json({ error: 'Termin nije pronađen.' }, { status: 404 })
      }
      if (termin.status === 'otkazan') {
        return NextResponse.json({ success: true, tier: 'already_cancelled', message: 'Termin je već otkazan.' })
      }
      datumVrijeme = termin.datum_vrijeme as string
    }

    const minutesBefore = minutesUntilStart(datumVrijeme)

    let tier: 'no_penalty' | 'late_warning' | 'blacklist' = 'no_penalty'
    if (minutesBefore <= MINUTES_BLACKLIST) {
      tier = 'blacklist'
    } else if (minutesBefore < MINUTES_WARN) {
      tier = 'late_warning'
    }

    if (tier === 'blacklist' && !hasServiceRoleKey()) {
      return NextResponse.json(
        {
          error:
            'Kasno otkazivanje zahteva administratorski ključ na serveru (SUPABASE_SERVICE_ROLE_KEY). Kontaktirajte podršku.',
        },
        { status: 503 }
      )
    }

    if (tier === 'blacklist') {
      const { error: blErr } = await service.from('kupci_crna_lista').upsert(
        {
          auth_user_id: userData.user.id,
          telefon: clientData.telefon,
          ime: clientData.ime,
          razlog: 'kasno_otkazivanje',
          minuta_pre_otkazivanja: Math.round(minutesBefore * 10) / 10,
          salon_id: salonId,
          termin_id: terminId,
        },
        { onConflict: 'auth_user_id' }
      )

      if (blErr) {
        return NextResponse.json(
          { error: `Termin je otkazan, ali zapis u crnoj listi nije uspeo: ${blErr.message}` },
          { status: 500 }
        )
      }
    }

    const messages: Record<string, string> = {
      no_penalty:
        'Termin je otkazan. Hvala što ste nas obavestili na vreme.',
      late_warning:
        'Termin je otkazan manje od 3 sata pre početka. Ovo je upozorenje: ako još jednom otkažete kasno, nalog može biti blokiran.',
      blacklist:
        'Termin je otkazan vrlo kasno ili je kasno otkazivanje ponovljeno. Vaš nalog je stavljen na crnu listu dok ga administrator ne odblokira.',
    }

    return NextResponse.json({
      success: true,
      tier,
      message: messages[tier] ?? 'Termin je otkazan.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Greška servera.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Izmena datuma/vremena, usluge ili napomene (samo ako je preostalo više od 30 min do termina). */
export async function PATCH(request: Request, context: RouteCtx) {
  try {
    const { ok: envOk } = getPublicSupabaseEnv()
    if (!envOk) {
      return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
    }

    const terminId = (await context.params).id
    if (!terminId) {
      return NextResponse.json({ error: 'Nedostaje id termina.' }, { status: 400 })
    }

    const authToken = getAuthToken(request)
    const url = new URL(request.url)
    const salonId = url.searchParams.get('salon_id')
    if (!authToken || !salonId) {
      return NextResponse.json({ error: 'Nedostaju auth token ili salon_id.' }, { status: 400 })
    }

    const anonClient = getAnonClient()
    if (!anonClient) {
      return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
    }

    const { data: userData, error: userError } = await anonClient.auth.getUser(authToken)
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Nevažeća sesija.' }, { status: 401 })
    }

    const userClient = getUserClient(authToken)
    if (!userClient) {
      return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
    }

    const ensured = await ensureSalonClientForCustomer(userClient, salonId, userData.user)
    if (!ensured.ok) {
      return NextResponse.json({ error: ensured.error }, { status: ensured.status })
    }
    const clientData = ensured.client

    const body = (await request.json()) as {
      datum_vrijeme?: string
      usluga_id?: string | null
      zaposleni_id?: string | null
      napomena?: string | null
    }

    const { data: termin, error: terminError } = await userClient
      .from('termini')
      .select('id, salon_id, client_id, datum_vrijeme, status, usluga_id, zaposleni_id')
      .eq('id', terminId)
      .eq('salon_id', salonId)
      .eq('client_id', clientData.id)
      .maybeSingle()

    if (terminError) return NextResponse.json({ error: terminError.message }, { status: 500 })
    if (!termin) {
      return NextResponse.json({ error: 'Termin nije pronađen.' }, { status: 404 })
    }

    if (termin.status === 'otkazan') {
      return NextResponse.json({ error: 'Otkazan termin se ne može menjati.' }, { status: 400 })
    }

    if (minutesUntilStart(termin.datum_vrijeme as string) <= MINUTES_BLACKLIST) {
      return NextResponse.json(
        { error: 'Izmena nije moguća: do termina je ostalo 30 minuta ili manje.' },
        { status: 400 }
      )
    }

    const patch: Record<string, string | null | boolean> = {}
    if (typeof body.datum_vrijeme === 'string' && body.datum_vrijeme.trim()) {
      patch.datum_vrijeme = body.datum_vrijeme.trim()
    }
    if (body.usluga_id !== undefined) {
      patch.usluga_id = body.usluga_id === null || body.usluga_id === '' ? null : String(body.usluga_id)
    }
    if (body.zaposleni_id !== undefined) {
      const zaposleniId = body.zaposleni_id === null || body.zaposleni_id === '' ? null : String(body.zaposleni_id)
      if (zaposleniId) {
        const { data: zaposleni, error: zaposleniError } = await userClient
          .from('zaposleni')
          .select('id')
          .eq('id', zaposleniId)
          .eq('salon_id', salonId)
          .eq('aktivan', true)
          .maybeSingle()
        if (zaposleniError) return NextResponse.json({ error: zaposleniError.message }, { status: 500 })
        if (!zaposleni) return NextResponse.json({ error: 'Zaposleni nije pronađen za ovaj salon.' }, { status: 400 })
      }
      patch.zaposleni_id = zaposleniId
    }
    if (body.napomena !== undefined) {
      patch.napomena = body.napomena === null ? null : String(body.napomena).trim() || null
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nema podataka za izmenu.' }, { status: 400 })
    }

    if (termin.status === 'potvrđen') {
      patch.last_updated_by_client = true
    }

    const { error: updErr } = await userClient.from('termini').update(patch).eq('id', terminId)

    if (updErr) {
      if (isSlotZauzetDbError(updErr)) {
        const newIso =
          typeof patch.datum_vrijeme === 'string' && patch.datum_vrijeme.trim()
            ? patch.datum_vrijeme.trim()
            : (termin.datum_vrijeme as string)
        const pDan = datumKljucBelgrad(newIso)
        const uslugaEff = (patch.usluga_id as string | undefined) ?? (termin.usluga_id as string | null)
        let zapEff: string | null =
          patch.zaposleni_id !== undefined ? (patch.zaposleni_id as string | null) : (termin.zaposleni_id as string | null)
        if (zapEff === '') zapEff = null
        if (!uslugaEff) {
          return NextResponse.json(
            {
              error:
                'Ovaj termin se preklapa sa drugim. Izaberite drugo vreme ili zaposlenog; za predloge slobodnih termina potrebna je usluga na terminu.',
              code: 'SLOT_ZAUZET',
              suggestions: [] as string[],
            },
            { status: 409 },
          )
        }
        const { data: sugRaw, error: sugErr } = await anonClient.rpc('predlozi_slobodne_slotove', {
          p_salon_id: salonId,
          p_usluga_id: uslugaEff,
          p_zaposleni_id: zapEff,
          p_dan: pDan,
          p_limit: 3,
          p_exclude_termin_id: terminId,
        })
        const suggestions = !sugErr ? normalizePredloziRpc(sugRaw).slice(0, 3) : []
        if (sugErr) {
          console.error('[clients/appointments PATCH] predlozi_slobodne_slotove:', sugErr.message)
        }
        return NextResponse.json(
          {
            error: 'Žao nam je, ovaj termin je zauzet. Izaberite prvi slobodan koji vam odgovara.',
            code: 'SLOT_ZAUZET',
            suggestions,
          },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Greška servera.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
