import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { rateLimitByIp } from '@/lib/rate-limit'
import { getAuthCookiesFromRequest, setAuthCookies } from '@/lib/auth-cookies'

/**
 * GET /api/auth/session
 * Reads httpOnly cookies and returns the current user info (without exposing tokens to JS).
 * Refreshes the session if the access token is expired but refresh token is valid.
 */
export async function GET(request: Request) {
  const rl = rateLimitByIp(request, 'auth-session-get', { maxRequests: 120, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Previše zahteva.' }, { status: 429 })
  }

  const { accessToken, refreshToken } = getAuthCookiesFromRequest(request)

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ user: null })
  }

  const { url, anonKey, ok } = getPublicSupabaseEnv()
  if (!ok) {
    return NextResponse.json({ user: null })
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken)

  if (!userError && userData.user) {
    return NextResponse.json({
      user: { id: userData.user.id, email: userData.user.email, user_metadata: userData.user.user_metadata },
    })
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  })

  if (refreshError || !refreshData.session) {
    return NextResponse.json({ user: null })
  }

  const response = NextResponse.json({
    user: {
      id: refreshData.user?.id,
      email: refreshData.user?.email,
      user_metadata: refreshData.user?.user_metadata,
    },
  })

  setAuthCookies(response, refreshData.session)
  return response
}
