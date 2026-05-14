import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendTransactionalEmail } from '@/lib/email/salon-admin-notify'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { rateLimitByIp } from '@/lib/rate-limit'
import { SUPABASE_PUBLIC_ENV_MISSING } from '@/lib/supabase-service-role-hint'
import { getAppRole } from '@/lib/user-role'
import { formatDatumVrijemeBelgrad } from '@/lib/termin-belgrade-vreme'

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
  return null
}

/** Posle potvrde termina u dashboardu — šalje korisniku mejl da je termin potvrđen. */
export async function POST(request: Request) {
  const rl = rateLimitByIp(request, 'salon-notify-customer-confirm', { maxRequests: 40, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Previše zahteva. Pokušajte za minut.' }, { status: 429 })
  }

  const { ok: envOk } = getPublicSupabaseEnv()
  if (!envOk) {
    return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
  }

  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'Nedostaje Authorization: Bearer token.' }, { status: 401 })
  }

  const anon = getAnonClient()
  if (!anon) {
    return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
  }

  const { data: userData, error: userErr } = await anon.auth.getUser(token)
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Nevažeća sesija.' }, { status: 401 })
  }
  if (getAppRole(userData.user) === 'customer') {
    return NextResponse.json({ error: 'Samo nalog salona može poslati ovo obaveštenje.' }, { status: 403 })
  }

  const salonId = userData.user.id

  let body: { termin_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON telo nije važeće.' }, { status: 400 })
  }

  const terminId = typeof body.termin_id === 'string' ? body.termin_id.trim() : ''
  if (!terminId) {
    return NextResponse.json({ error: 'Nedostaje termin_id.' }, { status: 400 })
  }

  const userClient = getUserClient(token)
  if (!userClient) {
    return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
  }

  const { data: termin, error: tErr } = await userClient
    .from('termini')
    .select('id, status, datum_vrijeme, ime_klijenta, client_id, usluga_id')
    .eq('id', terminId)
    .eq('salon_id', salonId)
    .maybeSingle()

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 })
  }
  if (!termin) {
    return NextResponse.json({ error: 'Termin nije pronađen.' }, { status: 404 })
  }
  if (termin.status !== 'potvrđen') {
    return NextResponse.json(
      {
        error:
          'Termin još nije označen kao potvrđen u bazi. Osvežite stranicu i pokušajte ponovo, ili potvrdite termin pa ponovo pošaljite obaveštenje.',
      },
      { status: 409 },
    )
  }

  const { data: klijent, error: cErr } = await userClient
    .from('salon_clients')
    .select('email, ime')
    .eq('id', termin.client_id as string)
    .eq('salon_id', salonId)
    .maybeSingle()

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 })
  }

  const customerEmail = typeof klijent?.email === 'string' ? klijent.email.trim() : ''
  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no_customer_email' })
  }

  const { data: sal, error: sErr } = await userClient.from('saloni').select('naziv').eq('id', salonId).maybeSingle()
  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 })
  }
  const salonNaziv = sal?.naziv ? String(sal.naziv) : 'Salon'

  let uslugaNaziv = ''
  if (termin.usluga_id) {
    const { data: u } = await userClient
      .from('usluge')
      .select('naziv')
      .eq('id', String(termin.usluga_id))
      .eq('salon_id', salonId)
      .maybeSingle()
    if (u?.naziv) uslugaNaziv = String(u.naziv)
  }

  const when = formatDatumVrijemeBelgrad(termin.datum_vrijeme as string)
  const imeK =
    typeof klijent?.ime === 'string' && klijent.ime.trim()
      ? klijent.ime.trim()
      : String(termin.ime_klijenta || 'korisniče')

  const text = [
    `Poštovani/a ${imeK},`,
    '',
    `Salon "${salonNaziv}" je potvrdio vaš termin.`,
    '',
    ...(uslugaNaziv ? [`Usluga: ${uslugaNaziv}`] : []),
    `Datum i vreme: ${when}`,
    '',
    'Vidimo se!',
    '',
    '— SalonPro',
  ].join('\n')

  const r = await sendTransactionalEmail({
    to: customerEmail,
    subject: `Potvrđen termin — ${salonNaziv}`,
    text,
  })

  if (!r.ok && !r.skipped) {
    return NextResponse.json({ error: 'Slanje mejla nije uspelo.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, sent: r.ok, skipped: Boolean(r.skipped) })
}
