import { createClient } from '@supabase/supabase-js'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { isPlatformAdminEmail } from '@/lib/platform-admin'

function getAnonClient() {
  const { url, anonKey, ok } = getPublicSupabaseEnv()
  if (!ok) return null
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7).trim() || null
}

export async function verifyPlatformAdmin(request: Request) {
  const token = getBearerToken(request)
  if (!token) {
    return { ok: false as const, status: 401, error: 'Nedostaje token autentifikacije.' }
  }

  const anon = getAnonClient()
  if (!anon) {
    return { ok: false as const, status: 500, error: 'Supabase env nedostaje.' }
  }

  const { data, error } = await anon.auth.getUser(token)
  if (error || !data.user) {
    return { ok: false as const, status: 401, error: 'Nevažeća sesija.' }
  }

  if (!isPlatformAdminEmail(data.user.email)) {
    return { ok: false as const, status: 403, error: 'Nemate administratorski pristup.' }
  }

  return { ok: true as const, user: data.user }
}
