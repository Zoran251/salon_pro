import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Server-side client: requires service role key for elevated operations. */
export function getServerSupabaseClient(): SupabaseClient | null {
  const { url: supabaseUrl, ok } = getPublicSupabaseEnv()
  if (!ok) return null
  if (!supabaseServiceRoleKey?.trim()) return null
  return createClient(supabaseUrl, supabaseServiceRoleKey.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function hasServiceRoleKey(): boolean {
  return Boolean(supabaseServiceRoleKey?.trim())
}
