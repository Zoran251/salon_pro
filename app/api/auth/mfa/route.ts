import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getBearerTokenFromRequest } from '@/lib/bearer-auth'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { rateLimitByIp } from '@/lib/rate-limit'

function getUserClient(token: string) {
  const { url, anonKey, ok } = getPublicSupabaseEnv()
  if (!ok) return null
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

/**
 * POST /api/auth/mfa
 * Actions: enroll, verify, unenroll, challenge
 *
 * - enroll: starts TOTP enrollment, returns QR URI + factor_id
 * - challenge: creates a challenge for an enrolled factor
 * - verify: verifies TOTP code against active challenge
 * - unenroll: removes a factor
 */
export async function POST(request: Request) {
  const rl = rateLimitByIp(request, 'mfa', { maxRequests: 15, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Previše zahteva.' }, { status: 429 })
  }

  const authToken = getBearerTokenFromRequest(request)
  if (!authToken) {
    return NextResponse.json({ error: 'Autentifikacija je obavezna.' }, { status: 401 })
  }

  const userClient = getUserClient(authToken)
  if (!userClient) {
    return NextResponse.json({ error: 'Server nije konfigurisan.' }, { status: 500 })
  }

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Nevažeća sesija.' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const action = body.action as string

    if (action === 'enroll') {
      const { data, error } = await userClient.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'SalonPro Authenticator',
      })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({
        factor_id: data.id,
        totp_uri: data.totp.uri,
        qr_code: data.totp.qr_code,
        secret: data.totp.secret,
      })
    }

    if (action === 'challenge') {
      const factorId = body.factor_id as string
      if (!factorId) {
        return NextResponse.json({ error: 'factor_id je obavezan.' }, { status: 400 })
      }
      const { data, error } = await userClient.auth.mfa.challenge({ factorId })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ challenge_id: data.id })
    }

    if (action === 'verify') {
      const factorId = body.factor_id as string
      const challengeId = body.challenge_id as string
      const code = body.code as string
      if (!factorId || !challengeId || !code) {
        return NextResponse.json({ error: 'factor_id, challenge_id i code su obavezni.' }, { status: 400 })
      }
      const { data, error } = await userClient.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ ok: true, session: data })
    }

    if (action === 'unenroll') {
      const factorId = body.factor_id as string
      if (!factorId) {
        return NextResponse.json({ error: 'factor_id je obavezan.' }, { status: 400 })
      }
      const { error } = await userClient.auth.mfa.unenroll({ factorId })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ ok: true })
    }

    if (action === 'list') {
      const { data, error } = await userClient.auth.mfa.listFactors()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({
        factors: data.totp.map(f => ({
          id: f.id,
          friendly_name: f.friendly_name,
          status: f.status,
          created_at: f.created_at,
        })),
      })
    }

    return NextResponse.json({ error: 'Nepoznata MFA akcija.' }, { status: 400 })
  } catch (e) {
    console.error('[mfa] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Greška servera.' }, { status: 500 })
  }
}
