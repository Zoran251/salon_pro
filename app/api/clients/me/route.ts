import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getBearerTokenFromRequest } from '@/lib/bearer-auth'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { ensureSalonClientForCustomer } from '@/lib/ensure-customer-salon-client'
import { isValidUuid } from '@/lib/is-valid-uuid'
import { rateLimitByIp } from '@/lib/rate-limit'
import { SUPABASE_PUBLIC_ENV_MISSING } from '@/lib/supabase-service-role-hint'

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
    global: {
      headers: { Authorization: `Bearer ${authToken}` },
    },
  })
}

type AppointmentRow = {
  id: string
  datum_vrijeme: string
  status: string | null
  ime_klijenta?: string | null
  telefon_klijenta?: string | null
  usluga_id?: string | null
  zaposleni_id?: string | null
  napomena?: string | null
  usluge?: { naziv?: string | null } | { naziv?: string | null }[] | null
  zaposleni?: { ime?: string | null; foto_url?: string | null } | { ime?: string | null; foto_url?: string | null }[] | null
}

function firstEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * Profil kupca + obaveštenja — JWT + RLS.
 */
export async function GET(request: Request) {
  try {
    const rl = rateLimitByIp(request, 'clients-me-get', { maxRequests: 120, windowMs: 60_000 })
    if (!rl.ok) {
      return NextResponse.json({ error: 'Previše zahteva. Pokušajte ponovo za minut.' }, { status: 429 })
    }

    const { ok: envOk } = getPublicSupabaseEnv()
    if (!envOk) {
      return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
    }

    const anonClient = getAnonClient()
    if (!anonClient) {
      return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const authToken = getBearerTokenFromRequest(request)
    const salonId = searchParams.get('salon_id')
    if (!authToken) {
      return NextResponse.json(
        { error: 'Nedostaje autorizacija: zaglavlje Authorization: Bearer <token>.' },
        { status: 401 },
      )
    }
    if (!salonId || !isValidUuid(salonId)) {
      return NextResponse.json({ error: 'Nedostaje ili je neispravan salon_id (UUID).' }, { status: 400 })
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

    const appointmentsResult = await userClient
      .from('termini')
      .select('id, datum_vrijeme, status, ime_klijenta, telefon_klijenta, usluga_id, zaposleni_id, napomena, usluge(naziv), zaposleni(ime, foto_url)')
      .eq('salon_id', salonId)
      .eq('client_id', clientData.id)
      .order('datum_vrijeme', { ascending: false })
      .limit(200)
    let appointments = appointmentsResult.data as AppointmentRow[] | null
    let appointmentsError = appointmentsResult.error

    if (appointmentsError && /zaposleni_id|zaposleni|schema cache/i.test(appointmentsError.message)) {
      const retry = await userClient
        .from('termini')
        .select('id, datum_vrijeme, status, ime_klijenta, telefon_klijenta, usluga_id, napomena, usluge(naziv)')
        .eq('salon_id', salonId)
        .eq('client_id', clientData.id)
        .order('datum_vrijeme', { ascending: false })
        .limit(200)
      appointments = retry.data as AppointmentRow[] | null
      appointmentsError = retry.error
    }

    if (appointmentsError) {
      console.error('[clients/me] termini:', appointmentsError.message)
      return NextResponse.json({ error: 'Greška pri učitavanju termina.' }, { status: 500 })
    }

    const { data: loyaltyData, error: loyaltyError } = await userClient
      .from('loyalty_accounts')
      .select('visits_count, progress_percent, reward_ready')
      .eq('salon_id', salonId)
      .eq('client_id', clientData.id)
      .maybeSingle()

    const loyaltyMissing =
      loyaltyError &&
      /loyalty_accounts|schema cache|does not exist/i.test(loyaltyError.message)
    if (loyaltyError && !loyaltyMissing) {
      console.error('[clients/me] loyalty:', loyaltyError.message)
      return NextResponse.json({ error: 'Greška pri učitavanju lojalnosti.' }, { status: 500 })
    }

    const includeAllNotifications = searchParams.get('notifications') === 'all'
    let notifQuery = userClient
      .from('notifications')
      .select('id, title, body, tip, created_at, read_at, appointment_id')
      .eq('client_id', clientData.id)
      .order('created_at', { ascending: false })
    if (!includeAllNotifications) {
      notifQuery = notifQuery.limit(30)
    }
    const { data: notifRows, error: notifErr } = await notifQuery

    if (notifErr) {
      console.error('[clients/me] notifications:', notifErr.message)
      return NextResponse.json({ error: 'Greška pri učitavanju obaveštenja.' }, { status: 500 })
    }

    const allAppointments = (appointments || []).map((appointment) => ({
      ...appointment,
      usluge: firstEmbed(appointment.usluge),
      zaposleni: firstEmbed(appointment.zaposleni),
    }))
    const stats = {
      ukupnoTermina: allAppointments.length,
      potvrdjeni: allAppointments.filter((a) => a.status === 'potvrđen').length,
      cekaju: allAppointments.filter((a) => a.status !== 'potvrđen' && a.status !== 'otkazan').length,
    }

    const { data: bookingBlocked, error: blErr } = await userClient.rpc('je_auth_blokiran', {
      p_uid: userData.user.id,
    })
    const booking_blocked = !blErr && bookingBlocked === true

    return NextResponse.json({
      client: clientData,
      stats,
      booking_blocked,
      loyalty:
        loyaltyData && !loyaltyError
          ? loyaltyData
          : { visits_count: 0, progress_percent: 0, reward_ready: false },
      appointments: allAppointments,
      notifications: notifRows || [],
    })
  } catch (error) {
    console.error('[clients/me] GET:', error)
    return NextResponse.json({ error: 'Greška servera.' }, { status: 500 })
  }
}

/**
 * Ažuriranje podataka kupca ili označavanje obaveštenja kao pročitanog.
 */
export async function PATCH(request: Request) {
  try {
    const rl = rateLimitByIp(request, 'clients-me-patch', { maxRequests: 40, windowMs: 60_000 })
    if (!rl.ok) {
      return NextResponse.json({ error: 'Previše zahteva. Pokušajte ponovo za minut.' }, { status: 429 })
    }

    const { ok: envOk } = getPublicSupabaseEnv()
    if (!envOk) {
      return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
    }

    const anonClient = getAnonClient()
    if (!anonClient) {
      return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
    }

    const authToken = getBearerTokenFromRequest(request)
    const url = new URL(request.url)
    const salonId = url.searchParams.get('salon_id')
    if (!authToken) {
      return NextResponse.json(
        { error: 'Nedostaje autorizacija: zaglavlje Authorization: Bearer <token>.' },
        { status: 401 },
      )
    }
    if (!salonId || !isValidUuid(salonId)) {
      return NextResponse.json({ error: 'Nedostaje ili je neispravan salon_id (UUID).' }, { status: 400 })
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
      ime?: string
      telefon?: string
      email?: string | null
      mark_notification_read?: string
    }

    if (typeof body.mark_notification_read === 'string' && body.mark_notification_read.trim()) {
      const nid = body.mark_notification_read.trim()
      if (!isValidUuid(nid)) {
        return NextResponse.json({ error: 'Neispravan ID obaveštenja.' }, { status: 400 })
      }
      const { error: upErr } = await userClient
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', nid)
        .eq('client_id', clientData.id)

      if (upErr) {
        console.error('[clients/me] mark read:', upErr.message)
        return NextResponse.json({ error: 'Ažuriranje obaveštenja nije uspelo.' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    const ime = typeof body.ime === 'string' ? body.ime.trim() : undefined
    const telefon = typeof body.telefon === 'string' ? body.telefon.trim() : undefined
    const email =
      body.email === null || body.email === undefined
        ? undefined
        : typeof body.email === 'string'
          ? body.email.trim() || null
          : undefined

    if (ime === undefined && telefon === undefined && email === undefined) {
      return NextResponse.json({ error: 'Nema podataka za izmenu.' }, { status: 400 })
    }

    const patch: Record<string, string | null> = {}
    if (ime !== undefined) {
      if (!ime) return NextResponse.json({ error: 'Ime ne može biti prazno.' }, { status: 400 })
      patch.ime = ime
    }
    if (telefon !== undefined) {
      if (!telefon) return NextResponse.json({ error: 'Telefon ne može biti prazan.' }, { status: 400 })
      patch.telefon = telefon
    }
    if (email !== undefined) patch.email = email

    const { error: updErr } = await userClient.from('salon_clients').update(patch).eq('id', clientData.id)

    if (updErr) {
      console.error('[clients/me] salon_clients update:', updErr.message)
      return NextResponse.json({ error: 'Snimanje profila nije uspelo.' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[clients/me] PATCH:', error)
    return NextResponse.json({ error: 'Greška servera.' }, { status: 500 })
  }
}
