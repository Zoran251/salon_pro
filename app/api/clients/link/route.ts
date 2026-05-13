import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getBearerTokenFromRequest } from '@/lib/bearer-auth'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
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

/**
 * Povezivanje kupca sa salonom preko RPC `link_salon_client` (bez service role).
 * Zahteva migraciju: db/migrations/2026-04-20_link_salon_client_rpc.sql
 */
export async function POST(request: Request) {
  try {
    const rl = rateLimitByIp(request, 'clients-link', { maxRequests: 20, windowMs: 60_000 })
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

    const body = await request.json()
    const { salon_id, ime, telefon, email } = body as {
      salon_id?: string
      ime?: string
      telefon?: string
      email?: string
      auth_token?: string
    }

    const authToken =
      getBearerTokenFromRequest(request) ||
      (typeof body.auth_token === 'string' ? body.auth_token.trim() : null)

    if (!authToken) {
      return NextResponse.json(
        { error: 'Nedostaje autorizacija: zaglavlje Authorization: Bearer <token>.' },
        { status: 401 },
      )
    }

    if (!salon_id || !isValidUuid(String(salon_id))) {
      return NextResponse.json({ error: 'Nedostaje ili je neispravan salon_id (UUID).' }, { status: 400 })
    }

    if (!telefon) {
      return NextResponse.json({ error: 'Nedostaju obavezni podaci.' }, { status: 400 })
    }

    const { data: authData, error: authError } = await anonClient.auth.getUser(authToken)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Nevažeća sesija klijenta.' }, { status: 401 })
    }

    const imeValue = typeof ime === 'string' && ime.trim() ? ime.trim() : 'Klijent'
    const telefonValue = String(telefon).trim()
    const emailValue = typeof email === 'string' && email.trim() ? email.trim() : authData.user.email || ''

    const userClient = getUserClient(authToken)
    if (!userClient) {
      return NextResponse.json({ error: SUPABASE_PUBLIC_ENV_MISSING }, { status: 500 })
    }

    const { data: clientId, error: rpcError } = await userClient.rpc('link_salon_client', {
      p_salon_id: salon_id,
      p_telefon: telefonValue,
      p_ime: imeValue,
      p_email: emailValue,
    })

    if (rpcError) {
      const msg = rpcError.message || 'Povezivanje nije uspelo.'
      const isMissingFn = /function public\.link_salon_client|link_salon_client/i.test(msg) && /does not exist/i.test(msg)
      console.error('[clients/link] rpc:', msg)
      return NextResponse.json(
        {
          error: isMissingFn
            ? 'U Supabase SQL Editor pokreni migraciju db/migrations/2026-04-20_link_salon_client_rpc.sql (funkcija link_salon_client).'
            : 'Povezivanje sa salonom nije uspelo.',
        },
        { status: 400 },
      )
    }

    if (!clientId || typeof clientId !== 'string') {
      return NextResponse.json({ error: 'Neočekivan odgovor iz baze.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, client_id: clientId })
  } catch (error) {
    console.error('[clients/link]', error)
    return NextResponse.json({ error: 'Greška servera.' }, { status: 500 })
  }
}
