const DEFAULT_SUPABASE_URL = 'https://smyyafarswtjndinskvg.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_75tUcK380X5UJFaIZRp9aw_popRRNRT'

/**
 * Jedinstveno čitanje Supabase URL/javnog ključa na serveru.
 * Podržava anon i publishable key imena, jer Supabase/Vercel integracija
 * može automatski dodati novije PUBLISHABLE_KEY varijable.
 * Podržava i NEXT_PUBLIC_* (ugrađuje se u klijent) i obične varijable (samo server),
 * koje layout injektuje u window.__SALON_SUPABASE__ pri svakom zahtevu.
 */
export function getPublicSupabaseEnv(): { url: string; anonKey: string; ok: boolean } {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  ).trim()
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY
  ).trim()
  return { url, anonKey, ok: Boolean(url && anonKey) }
}
