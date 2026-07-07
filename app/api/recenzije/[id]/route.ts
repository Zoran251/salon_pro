import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { getServerSupabaseClient } from '@/lib/server-supabase'

type RouteCtx = { params: Promise<{ id: string }> }

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) return null
  const token = authHeader.slice(7).trim()
  return token || null
}

export async function DELETE(request: Request, context: RouteCtx) {
  try {
    const recenzijaId = (await context.params).id
    if (!recenzijaId || !uuidRe.test(recenzijaId)) {
      return NextResponse.json({ error: 'Nevažeći ID recenzije.' }, { status: 400 })
    }

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

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Server nije konfigurisan.' }, { status: 500 })
    }

    const { data: recenzija, error: findErr } = await supabase
      .from('recenzije')
      .select('id, salon_id, client_id')
      .eq('id', recenzijaId)
      .maybeSingle()

    if (findErr) {
      console.error('[recenzije] find error:', findErr.message)
      return NextResponse.json({ error: 'Greška pri pronalaženju recenzije.' }, { status: 500 })
    }

    if (!recenzija) {
      return NextResponse.json({ error: 'Recenzija nije pronađena.' }, { status: 404 })
    }

    const uid = userData.user.id

    const { data: clientRecord } = await supabase
      .from('salon_clients')
      .select('id')
      .eq('id', recenzija.client_id)
      .eq('auth_user_id', uid)
      .maybeSingle()

    const isAuthor = !!clientRecord

    const { data: salonRecord } = await supabase
      .from('saloni')
      .select('id')
      .eq('id', recenzija.salon_id)
      .eq('id', uid)
      .maybeSingle()

    const isSalonOwner = !!salonRecord

    if (!isAuthor && !isSalonOwner) {
      return NextResponse.json(
        { error: 'Nemate dozvolu za brisanje ove recenzije.' },
        { status: 403 }
      )
    }

    const { error: delErr } = await supabase.from('recenzije').delete().eq('id', recenzijaId)

    if (delErr) {
      console.error('[recenzije] delete error:', delErr.message)
      return NextResponse.json({ error: 'Brisanje recenzije nije uspelo.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[recenzije] unexpected error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Greška servera.' }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteCtx) {
  try {
    const recenzijaId = (await context.params).id
    if (!recenzijaId || !uuidRe.test(recenzijaId)) {
      return NextResponse.json({ error: 'Nevažeći ID recenzije.' }, { status: 400 })
    }

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
    const { odgovor } = body

    if (typeof odgovor !== 'string' || !odgovor.trim()) {
      return NextResponse.json({ error: 'Nedostaje tekst odgovora.' }, { status: 400 })
    }

    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Server nije konfigurisan.' }, { status: 500 })
    }

    const { data: recenzija, error: findErr } = await supabase
      .from('recenzije')
      .select('salon_id')
      .eq('id', recenzijaId)
      .maybeSingle()

    if (findErr) {
      console.error('[recenzije] find error:', findErr.message)
      return NextResponse.json({ error: 'Greška pri pronalaženju recenzije.' }, { status: 500 })
    }

    if (!recenzija) {
      return NextResponse.json({ error: 'Recenzija nije pronađena.' }, { status: 404 })
    }

    const uid = userData.user.id

    const { data: salonRecord } = await supabase
      .from('saloni')
      .select('id')
      .eq('id', recenzija.salon_id)
      .eq('id', uid)
      .maybeSingle()

    if (!salonRecord) {
      return NextResponse.json(
        { error: 'Samo vlasnik salona može dodati odgovor na recenziju.' },
        { status: 403 }
      )
    }

    const { error: updErr } = await supabase
      .from('recenzije')
      .update({
        odgovor: odgovor.trim(),
        odgovor_created_at: new Date().toISOString(),
      })
      .eq('id', recenzijaId)

    if (updErr) {
      console.error('[recenzije] odgovor update error:', updErr.message)
      return NextResponse.json({ error: 'Dodavanje odgovora nije uspelo.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[recenzije] unexpected error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Greška servera.' }, { status: 500 })
  }
}
