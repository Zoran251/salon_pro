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

    if (!endpoint) return NextResponse.json({ error: 'Nedostaje endpoint.' }, { status: 400 })

    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { error } = await userClient
      .from('device_tokens')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Greška servera.' }, { status: 500 })
  }
}
