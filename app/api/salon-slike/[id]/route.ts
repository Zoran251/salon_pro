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
    const slikaId = (await context.params).id
    if (!slikaId || !uuidRe.test(slikaId)) {
      return NextResponse.json({ error: 'Nevažeći ID slike.' }, { status: 400 })
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

    const { data: slika, error: findErr } = await supabase
      .from('salon_slike')
      .select('id, salon_id')
      .eq('id', slikaId)
      .maybeSingle()

    if (findErr) {
      console.error('[salon-slike] find error:', findErr.message)
      return NextResponse.json({ error: 'Greška pri pronalaženju slike.' }, { status: 500 })
    }

    if (!slika) {
      return NextResponse.json({ error: 'Slika nije pronađena.' }, { status: 404 })
    }

    const uid = userData.user.id

    const { data: salonRecord } = await supabase
      .from('saloni')
      .select('id')
      .eq('id', slika.salon_id)
      .eq('id', uid)
      .maybeSingle()

    if (!salonRecord) {
      return NextResponse.json(
        { error: 'Samo vlasnik salona može brisati slike.' },
        { status: 403 }
      )
    }

    const { error: delErr } = await supabase.from('salon_slike').delete().eq('id', slikaId)

    if (delErr) {
      console.error('[salon-slike] delete error:', delErr.message)
      return NextResponse.json({ error: 'Brisanje slike nije uspelo.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[salon-slike] unexpected error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Greška servera.' }, { status: 500 })
  }
}
