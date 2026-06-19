import { NextResponse } from 'next/server'
import { verifyPlatformAdmin } from '@/lib/admin-api-auth'
import { getServerSupabaseClient, hasServiceRoleKey } from '@/lib/server-supabase'

const SALON_SELECT =
  'id, naziv, slug, email, telefon, grad, tip, aktivan, opis, adresa, radno_od, radno_do, logo_url, boja_primarna, boja_sekundarna, boja_akcent, boja_font, landing_page, created_at'

/** Lista svih salona — samo platform admin. */
export async function GET(request: Request) {
  const auth = await verifyPlatformAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY nije postavljen na serveru.' },
      { status: 503 },
    )
  }

  const admin = getServerSupabaseClient()
  if (!admin) {
    return NextResponse.json({ error: 'Supabase env nedostaje.' }, { status: 500 })
  }

  const { data, error } = await admin
    .from('saloni')
    .select(SALON_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ saloni: data || [] })
}

/** Ažuriranje salona po id — samo platform admin. */
export async function PATCH(request: Request) {
  const auth = await verifyPlatformAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY nije postavljen na serveru.' },
      { status: 503 },
    )
  }

  const admin = getServerSupabaseClient()
  if (!admin) {
    return NextResponse.json({ error: 'Supabase env nedostaje.' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const salonId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!salonId) {
      return NextResponse.json({ error: 'Nedostaje id salona.' }, { status: 400 })
    }

    const allowed = [
      'naziv',
      'slug',
      'email',
      'telefon',
      'grad',
      'tip',
      'aktivan',
      'opis',
      'adresa',
      'radno_od',
      'radno_do',
      'logo_url',
      'boja_primarna',
      'boja_sekundarna',
      'boja_akcent',
      'boja_font',
      'landing_page',
    ] as const

    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nema polja za ažuriranje.' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('saloni')
      .update(update)
      .eq('id', salonId)
      .select(SALON_SELECT)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ salon: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Greška na serveru.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
