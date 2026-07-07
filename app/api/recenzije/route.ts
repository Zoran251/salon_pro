import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { getServerSupabaseClient } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) return null
  const token = authHeader.slice(7).trim()
  return token || null
}

export async function GET(request: Request) {
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Server nije konfigurisan.' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const salon_id = searchParams.get('salon_id')

  if (!salon_id) {
    return NextResponse.json({ error: 'Nedostaje salon_id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('recenzije')
    .select('*, salon_clients(ime)')
    .eq('salon_id', salon_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[recenzije] GET error:', error.message)
    return NextResponse.json({ error: 'Učitavanje recenzija nije uspelo.' }, { status: 500 })
  }

  return NextResponse.json({ recenzije: data || [] })
}

export async function POST(request: Request) {
  try {
    const { url, anonKey, ok: envOk } = getPublicSupabaseEnv()
    if (!envOk) {
      return NextResponse.json({ error: 'Server nije konfigurisan.' }, { status: 500 })
    }

    const authToken = getAuthToken(request)
    if (!authToken) {
      return NextResponse.json({ error: 'Autentifikacija je obavezna.' }, { status: 401 })
    }

    const anonClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await anonClient.auth.getUser(authToken)
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Nevažeća sesija.' }, { status: 401 })
    }

    const body = await request.json()
    const { salon_id, ocjena, komentar } = body

    if (!salon_id || !ocjena) {
      return NextResponse.json({ error: 'Nedostaju obavezni podaci (salon_id, ocjena).' }, { status: 400 })
    }

    const ocjenaNum = Number(ocjena)
    if (!Number.isInteger(ocjenaNum) || ocjenaNum < 1 || ocjenaNum > 5) {
      return NextResponse.json({ error: 'Ocjena mora biti cijeli broj od 1 do 5.' }, { status: 400 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Server nije konfigurisan.' }, { status: 500 })
    }

    const { data: clientRecord, error: clientErr } = await supabase
      .from('salon_clients')
      .select('id')
      .eq('salon_id', salon_id)
      .eq('auth_user_id', userData.user.id)
      .maybeSingle()

    if (clientErr) {
      console.error('[recenzije] client lookup error:', clientErr.message)
      return NextResponse.json({ error: 'Greška pri provjeri korisnika.' }, { status: 500 })
    }

    if (!clientRecord) {
      return NextResponse.json(
        { error: 'Morate biti povezani sa salonom da biste ostavili recenziju.' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('recenzije')
      .upsert(
        {
          salon_id,
          client_id: clientRecord.id,
          ocjena: ocjenaNum,
          komentar: typeof komentar === 'string' ? komentar : '',
        },
        { onConflict: 'client_id, salon_id' }
      )
      .select()
      .maybeSingle()

    if (error) {
      console.error('[recenzije] upsert error:', error.message)
      return NextResponse.json({ error: 'Slanje recenzije nije uspelo.' }, { status: 500 })
    }

    return NextResponse.json({ recenzija: data })
  } catch (error) {
    console.error('[recenzije] unexpected error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Greška servera.' }, { status: 500 })
  }
}
