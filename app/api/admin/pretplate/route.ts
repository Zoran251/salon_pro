import { NextResponse } from 'next/server'
import { verifyPlatformAdmin } from '@/lib/admin-api-auth'
import { getServerSupabaseClient, hasServiceRoleKey } from '@/lib/server-supabase'

export async function GET(request: Request) {
  const auth = await verifyPlatformAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!hasServiceRoleKey()) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_SECRET nije postavljen.' }, { status: 503 })

  const admin = getServerSupabaseClient()
  if (!admin) return NextResponse.json({ error: 'Supabase env nedostaje.' }, { status: 500 })

  const { data, error } = await admin
    .from('salon_subscriptions')
    .select(`
      id,
      salon_id,
      plan_id,
      status,
      starts_at,
      expires_at,
      created_at,
      plan:plan_id (tip, naziv, cijena_eur, period),
      salon:salon_id (naziv, email, telefon, grad, slug)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data: data || [] })
}
