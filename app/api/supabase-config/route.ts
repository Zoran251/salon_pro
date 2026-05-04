import { NextResponse } from 'next/server'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'

/** Dijagnostika: da li server vidi Supabase env. Ne otkriva hostname ni interne detalje. */
export async function GET() {
  const { ok } = getPublicSupabaseEnv()
  return NextResponse.json({
    ok,
    hint: ok
      ? 'Server ima Supabase konfiguraciju.'
      : 'Postavi NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY u environment varijable.',
  })
}
