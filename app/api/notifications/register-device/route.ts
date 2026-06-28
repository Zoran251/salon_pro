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
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : ''
    const authKey = typeof body.auth_key === 'string' ? body.auth_key.trim() : ''
    const p256dhKey = typeof body.p256dh_key === 'string' ? body.p256dh_key.trim() : ''
    const salonId = typeof body.salon_id === 'string' ? body.salon_id.trim() : null

    if (!endpoint) return NextResponse.json({ error: 'Nedostaje endpoint.' }, { status: 400 })

    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    // Provjeri da li subscription već postoji po endpointu
    const { data: existing } = await userClient
      .from('device_tokens')
      .select('id')
      .eq('endpoint', endpoint)
      .maybeSingle()

    if (existing) {
      // Ažuriraj postojeći
      const { error } = await userClient
        .from('device_tokens')
        .update({
          auth_key: authKey,
          p256dh_key: p256dhKey,
          user_id: user.id,
          salon_id: salonId,
          platform: 'web',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    } else {
      // Novi Web Push subscription (token se ostavlja null — legacy FCM)
      const { error } = await userClient.from('device_tokens').insert({
        user_id: user.id,
        token: null,
        endpoint,
        auth_key: authKey,
        p256dh_key: p256dhKey,
        platform: 'web',
        salon_id: salonId,
      })

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Greška servera.' }, { status: 500 })
  }
}
