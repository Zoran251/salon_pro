import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { buildSalonSlug, fallbackSalonSlug } from '@/lib/slug'
import { rateLimitByIp } from '@/lib/rate-limit'

/**
 * Kreiranje reda u `saloni` kada nakon signUp nema sesije (obavezna potvrda emaila).
 * Zahtijeva SUPABASE_SERVICE_ROLE_KEY na serveru.
 * Zahtijeva da caller dokaže identitet: userId mora postojati u auth.users.
 */
export async function POST(request: Request) {
  const rl = rateLimitByIp(request, 'salon-register', { maxRequests: 5, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Previše zahteva. Pokušajte ponovo za minut.' },
      { status: 429 },
    )
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_SECRET?.trim() ?? ''
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'Server konfiguracija nepotpuna.' },
      { status: 503 },
    )
  }

  const { url, ok } = getPublicSupabaseEnv()
  if (!ok) {
    return NextResponse.json({ error: 'Server konfiguracija nepotpuna.' }, { status: 500 })
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const body = await request.json()
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const naziv = typeof body.naziv === 'string' ? body.naziv : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const telefon = typeof body.telefon === 'string' ? body.telefon : ''
    const grad = typeof body.grad === 'string' ? body.grad : ''
    const tip = typeof body.tip === 'string' ? body.tip : ''
    const referalKodUnos =
      typeof body.referalKod === 'string'
        ? body.referalKod.trim().slice(0, 32)
        : typeof body.referal_kod === 'string'
          ? body.referal_kod.trim().slice(0, 32)
          : ''
    const prihvatioUslove = body.prihvatioUslove === true

    const uid = typeof userId === 'string' ? userId.trim() : ''
    if (!uid || !naziv || !email) {
      return NextResponse.json({ error: 'Nedostaju obavezni podaci.' }, { status: 400 })
    }

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRe.test(uid)) {
      return NextResponse.json({ error: 'Nevažeći format korisničkog ID-a.' }, { status: 400 })
    }

    let verifiedUser: { id: string; email?: string } | null = null
    let lastAuthErr: { message: string } | null = null
    for (let attempt = 0; attempt < 6; attempt++) {
      const { data, error: authErr } = await admin.auth.admin.getUserById(uid)
      lastAuthErr = authErr
      if (!authErr && data?.user) {
        verifiedUser = data.user
        break
      }
      await new Promise((r) => setTimeout(r, 180 * (attempt + 1)))
    }
    if (!verifiedUser) {
      console.warn('[register-initial] getUserById failed after retries:', lastAuthErr?.message)
      return NextResponse.json({ error: 'Korisnički nalog nije pronađen.' }, { status: 403 })
    }

    if (verifiedUser.email && verifiedUser.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Email se ne poklapa sa registrovanim nalogom.' }, { status: 403 })
    }

    const baseSlug = fallbackSalonSlug(buildSalonSlug(naziv))
    let slug = baseSlug
    let suffix = 2
    while (true) {
      const { data: existing } = await admin.from('saloni').select('id').eq('slug', slug).maybeSingle()
      if (!existing) break
      slug = `${baseSlug}-${suffix}`
      suffix += 1
    }

    const insertPayload: Record<string, unknown> = {
      id: uid,
      naziv,
      slug,
      email,
      telefon,
      grad,
      tip,
      aktivan: true,
      boja_primarna: '#d4af37',
      boja_sekundarna: '#121212',
      boja_akcent: '#f5e17a',
      boja_font: '#f5f0e8',
      prihvatio_uslove: prihvatioUslove,
      uslovi_prihvacen_at: prihvatioUslove ? new Date().toISOString() : null,
    }
    if (referalKodUnos) {
      insertPayload.referal_kod_prijava = referalKodUnos
    }

    const { error: insErr } = await admin.from('saloni').insert(insertPayload)

    if (insErr) {
      console.error('[register-initial] insert error:', insErr.message)
      return NextResponse.json({ error: 'Kreiranje salona nije uspelo.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, slug })
  } catch (e) {
    console.error('[register-initial] unexpected error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Greška na serveru.' }, { status: 500 })
  }
}
