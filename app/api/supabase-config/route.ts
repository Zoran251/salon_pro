import { NextResponse } from 'next/server'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'

/**
 * Dijagnostika (samo van produkcije na Vercelu): da li server vidi Supabase env.
 * U VERCEL_ENV=production vraća 404 da se ne otkriva stanje konfiguracije javnosti.
 */
export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }
  const { ok } = getPublicSupabaseEnv()
  return NextResponse.json({
    ok,
    hint: ok
      ? 'Server ima Supabase konfiguraciju.'
      : 'Postavi NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY u environment varijable.',
  })
}
