import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'

function readServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_SECRET
}

/** Server-side client: prefers service role za RLS; inače anon key. */
export function getServerSupabaseClient(): SupabaseClient | null {
  const { url: supabaseUrl, anonKey: supabaseAnonKey, ok } = getPublicSupabaseEnv()
  if (!ok) return null
  const key = readServiceRoleKey() || supabaseAnonKey
  if (!key) return null
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function hasServiceRoleKey(): boolean {
  return Boolean(readServiceRoleKey()?.trim())
}
