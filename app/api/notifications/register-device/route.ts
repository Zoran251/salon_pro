import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'

export async function POST(request: Request) {
  const { url, anonKey, ok } = getPublicSupabaseEnv()
  if (!ok) return NextResponse.json({ error: 'Supabase env nedostaje.' }, { status: 500 })

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null
  if (!token) return NextResponse.json({ error: 'Nedostaje token.' }, { status: 401 })

  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user }, error: userErr } = await anon.auth.getUser(token)
  if (userErr || !user) return NextResponse.json({ error: 'Nevažeća sesija.' }, { status: 401 })

  try {
    const body = await request.json()
    const deviceToken = typeof body.token === 'string' ? body.token.trim() : ''
    const platform = typeof body.platform === 'string' ? body.platform.trim() : 'web'
    const salonId = typeof body.salon_id === 'string' ? body.salon_id.trim() : null

    if (!deviceToken) return NextResponse.json({ error: 'Nedostaje device token.' }, { status: 400 })

    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { error } = await userClient.from('device_tokens').upsert({
      user_id: user.id,
      token: deviceToken,
      platform,
      salon_id: salonId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'token', ignoreDuplicates: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Greška servera.' }, { status: 500 })
  }
}
