import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { getServerSupabaseClient } from '@/lib/server-supabase'
import { sendPushToSubscriptions } from '@/lib/web-push/server'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  // Provjera CRON_SECRET (optional, radi i bez)
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const srv = getServerSupabaseClient()
  if (!srv) return NextResponse.json({ error: 'Server client not available' }, { status: 503 })

  const { data: { url, anonKey, ok } } = { data: getPublicSupabaseEnv() }
  if (!ok) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 })

  // Pronađi potvrđene termine koji počinju za 45-75 minuta i još nisu dobili podsjetnik
  const now = new Date()
  const fromTime = new Date(now.getTime() + 45 * 60 * 1000).toISOString()
  const toTime = new Date(now.getTime() + 75 * 60 * 1000).toISOString()

  const { data: termini, error: tErr } = await srv
    .from('termini')
    .select('id, datum_vrijeme, ime_klijenta, client_id, salon_id, usluga_id')
    .eq('status', 'potvrđen')
    .eq('podsjetnik_poslan', false)
    .gte('datum_vrijeme', fromTime)
    .lt('datum_vrijeme', toTime)
    .limit(50)

  if (tErr) {
    console.error('[cron-termin-reminder] Greška:', tErr.message)
    return NextResponse.json({ error: tErr.message }, { status: 500 })
  }

  if (!termini || termini.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  let sentCount = 0

  for (const termin of termini) {
    try {
      // Dohvati naziv salona
      const { data: salon } = await srv.from('saloni').select('naziv').eq('id', termin.salon_id).maybeSingle()
      const salonNaziv = salon?.naziv || 'Salon'

      // Umetni in-app notifikaciju za klijenta
      if (termin.client_id) {
        await srv.from('notifications').insert({
          salon_id: termin.salon_id,
          client_id: termin.client_id,
          tip: 'appointment_reminder',
          title: `Podsjetnik — ${salonNaziv}`,
          body: 'Vaš termin je za 1h, hvala vam što koristite naše usluge.',
          appointment_id: termin.id,
        })
      }

      // Pošalji push notifikaciju klijentu
      if (termin.client_id) {
        // Prvo dohvati auth_user_id iz salon_clients (termini.client_id je salon_clients.id)
        const { data: klijentAuth } = await srv
          .from('salon_clients')
          .select('auth_user_id')
          .eq('id', termin.client_id)
          .maybeSingle()

        const authUserId = klijentAuth?.auth_user_id
        if (authUserId) {
          const { data: tokens } = await srv
            .from('device_tokens')
            .select('endpoint, auth_key, p256dh_key')
            .eq('user_id', authUserId)
            .not('endpoint', 'is', null)

          if (tokens && tokens.length > 0) {
            const result = await sendPushToSubscriptions(
              tokens as Array<{ endpoint: string; auth_key: string; p256dh_key: string }>,
              {
                title: `Podsjetnik — ${salonNaziv}`,
                body: 'Vaš termin je za 1h, hvala vam što koristite naše usluge.',
                url: `/salon/${termin.salon_id}`,
              },
              async (endpoint) => {
                await srv.from('device_tokens').delete().eq('endpoint', endpoint)
              },
            )

            // Ako nema web push subscriptiona, probaj preko FCM (backward compatibility)
            if (result.sent === 0 && authUserId) {
              const { data: fcmTokens } = await srv
                .from('device_tokens')
                .select('token')
                .eq('user_id', authUserId)
                .is('endpoint', null)

              if (fcmTokens && fcmTokens.length > 0) {
                try {
                  const { sendMulticastNotification } = await import('@/lib/notifications/firebase-config')
                  await sendMulticastNotification(
                    fcmTokens.map(t => t.token).filter(Boolean) as string[],
                    `Podsjetnik — ${salonNaziv}`,
                    'Vaš termin je za 1h, hvala vam što koristite naše usluge.',
                    { type: 'appointment_reminder', salon_id: termin.salon_id, termin_id: termin.id },
                  )
                  sentCount++
                } catch { /* silent */ }
              }
            }

            sentCount += result.sent
          }
        }
      }

      // Takođe pošalji vlasniku salona
      const { data: salonTokens } = await srv
        .from('device_tokens')
        .select('endpoint, auth_key, p256dh_key')
        .eq('salon_id', termin.salon_id)
        .not('endpoint', 'is', null)

      if (salonTokens && salonTokens.length > 0) {
        await sendPushToSubscriptions(
          salonTokens as Array<{ endpoint: string; auth_key: string; p256dh_key: string }>,
          {
            title: `Podsjetnik — ${termin.ime_klijenta || 'Klijent'}`,
            body: `Termin za 1h: ${termin.ime_klijenta || 'Klijent'}`,
            url: `/dashboard`,
          },
          async (endpoint) => {
            await srv.from('device_tokens').delete().eq('endpoint', endpoint)
          },
        )
      }

      // Označi da je podsjetnik poslan (bez obzira na uspjeh pusha, da se ne ponavlja)
      await srv.from('termini').update({ podsjetnik_poslan: true }).eq('id', termin.id)
    } catch (err) {
      console.error('[cron-termin-reminder] Greška za termin', termin.id, err)
    }
  }

  return NextResponse.json({ ok: true, checked: termini.length, sent: sentCount })
}
