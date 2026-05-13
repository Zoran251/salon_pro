import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { rateLimitByIp } from '@/lib/rate-limit'
import { getServerSupabaseClient } from '@/lib/server-supabase'

type RouteCtx = { params: Promise<{ id: string }> }

function getAuthHeaderToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) return null
  const token = authHeader.slice(7).trim()
  return token || null
}

export async function POST(request: Request, context: RouteCtx) {
  try {
    const rl = rateLimitByIp(request, 'appointments-no-show', { maxRequests: 30, windowMs: 60_000 })
    if (!rl.ok) {
      return NextResponse.json({ error: 'Previše zahteva.' }, { status: 429 })
    }

    const terminId = (await context.params).id
    if (!terminId) {
      return NextResponse.json({ error: 'Nedostaje id termina.' }, { status: 400 })
    }

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRe.test(terminId)) {
      return NextResponse.json({ error: 'Nevažeći format ID-a.' }, { status: 400 })
    }

    const authToken = getAuthHeaderToken(request)
    if (!authToken) {
      return NextResponse.json({ error: 'Autentifikacija je obavezna.' }, { status: 401 })
    }

    const { url, anonKey, ok: envOk } = getPublicSupabaseEnv()
    if (!envOk) {
      return NextResponse.json({ error: 'Server nije konfigurisan.' }, { status: 500 })
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

    const { data, error } = await supabase.rpc('mark_appointment_no_show', {
      p_termin_id: terminId,
    })

    if (error) {
      const missingFn =
        /mark_appointment_no_show|function .* does not exist|Could not find the function/i.test(error.message)
      return NextResponse.json(
        {
          error: missingFn
            ? 'Baza nije ažurirana: pokreni migraciju db/migrations/2026-05-09_cancellation_warning_rules.sql.'
            : error.message,
        },
        { status: missingFn ? 503 : 500 },
      )
    }

    const payload = data as { ok?: boolean; error?: string; message?: string } | null
    if (payload?.ok === false) {
      return NextResponse.json({ error: payload.error || 'Akcija nije uspela.' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: payload?.message || 'Kupac je označen kao da se nije pojavio i dodat je na crnu listu.',
    })
  } catch (error) {
    console.error('[no-show] unexpected error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Greška servera.' }, { status: 500 })
  }
}
