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
    .from('salon_slike')
    .select('*')
    .eq('salon_id', salon_id)
    .order('redoslijed', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[salon-slike] GET error:', error.message)
    return NextResponse.json({ error: 'Učitavanje slika nije uspelo.' }, { status: 500 })
  }

  return NextResponse.json({ slike: data || [] })
}

export async function POST(request: Request) {
  try {
    const { url: supabaseUrl, anonKey, ok: envOk } = getPublicSupabaseEnv()
    if (!envOk) {
      return NextResponse.json({ error: 'Server nije konfigurisan.' }, { status: 500 })
    }

    const authToken = getAuthToken(request)
    if (!authToken) {
      return NextResponse.json({ error: 'Autentifikacija je obavezna.' }, { status: 401 })
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await anonClient.auth.getUser(authToken)
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Nevažeća sesija.' }, { status: 401 })
    }

    const body = await request.json()
    const { salon_id, url: slikaUrl, opis, redoslijed } = body

    if (!salon_id || !slikaUrl) {
      return NextResponse.json({ error: 'Nedostaju obavezni podaci (salon_id, url).' }, { status: 400 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Server nije konfigurisan.' }, { status: 500 })
    }

    const uid = userData.user.id

    const { data: salonRecord } = await supabase
      .from('saloni')
      .select('id')
      .eq('id', salon_id)
      .eq('id', uid)
      .maybeSingle()

    if (!salonRecord) {
      return NextResponse.json(
        { error: 'Samo vlasnik salona može dodavati slike.' },
        { status: 403 }
      )
    }

    const insertData: Record<string, unknown> = {
      salon_id,
      url: slikaUrl,
      opis: typeof opis === 'string' ? opis : '',
    }
    if (typeof redoslijed === 'number') {
      insertData.redoslijed = redoslijed
    }

    const { data, error } = await supabase.from('salon_slike').insert(insertData).select().single()

    if (error) {
      console.error('[salon-slike] insert error:', error.message)
      return NextResponse.json({ error: 'Dodavanje slike nije uspelo.' }, { status: 500 })
    }

    return NextResponse.json({ slika: data })
  } catch (error) {
    console.error('[salon-slike] unexpected error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Greška servera.' }, { status: 500 })
  }
}
