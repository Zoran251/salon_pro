// app/api/notifications/subscribe/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBearerTokenFromRequest } from '@/lib/bearer-auth'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { rateLimitByIp } from '@/lib/rate-limit'
import { subscribeToTopic, unsubscribeFromTopic } from '@/lib/notifications/firebase-config'

export const dynamic = 'force-dynamic'

interface SubscribeBody {
  deviceToken: string
  deviceType: 'web' | 'mobile' | 'whatsapp'
  salonId?: string
  clientId?: string
  phoneNumber?: string
  action: 'subscribe' | 'unsubscribe'
}

function getUserClient(authToken: string) {
  const { url, anonKey, ok } = getPublicSupabaseEnv()
  if (!ok) return null
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${authToken}` },
    },
  })
}

function getAnonClient() {
  const { url, anonKey, ok } = getPublicSupabaseEnv()
  if (!ok) return null
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * POST - Pretplati se ili odjavi se od push notifikacija
 */
export async function POST(request: Request) {
  try {
    const rl = rateLimitByIp(request, 'notifications-subscribe', { maxRequests: 40, windowMs: 60_000 })
    if (!rl.ok) {
      return NextResponse.json({ error: 'Previše zahteva.' }, { status: 429 })
    }

    const body: SubscribeBody = await request.json()
    const {
      deviceToken,
      deviceType,
      salonId,
      clientId,
      phoneNumber,
      action,
    } = body

    // Validacija
    if (!deviceToken || !deviceType || !action) {
      return NextResponse.json(
        { error: 'Nedostaju obavezni podaci: deviceToken, deviceType, action' },
        { status: 400 }
      )
    }

    if (!['subscribe', 'unsubscribe'].includes(action)) {
      return NextResponse.json(
        { error: 'action mora biti "subscribe" ili "unsubscribe"' },
        { status: 400 }
      )
    }

    const authToken = getBearerTokenFromRequest(request)

    if (!authToken) {
      return NextResponse.json(
        { error: 'Nedostaje autorizacija: zaglavlje Authorization: Bearer <token>.' },
        { status: 401 },
      )
    }

    const anonClient = getAnonClient()
    if (!anonClient) {
      return NextResponse.json(
        { error: 'Server nije konfigurisan' },
        { status: 500 }
      )
    }

    // Proveraj da li korisnik postoji
    const { data: userData, error: userError } = await anonClient.auth.getUser(
      authToken
    )
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Nevažeća sesija' },
        { status: 401 }
      )
    }

    const userClient = getUserClient(authToken)
    if (!userClient) {
      return NextResponse.json(
        { error: 'Server nije konfigurisan' },
        { status: 500 }
      )
    }

    const userId = userData.user.id

    if (action === 'subscribe') {
      // Unesi token u bazu
      const { data: existingToken, error: checkError } = await userClient
        .from('notification_tokens')
        .select('id')
        .eq('push_token', deviceToken)
        .eq('device_type', deviceType)
        .single()

      if (!checkError && existingToken) {
        // Token već postoji, samo ažuriraj status
        await userClient
          .from('notification_tokens')
          .update({
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingToken.id)
      } else {
        // Unesi novi token
        const { error: insertError } = await userClient
          .from('notification_tokens')
          .insert({
            client_id: clientId || userId,
            salon_id: salonId || null,
            push_token: deviceToken,
            whatsapp_number: phoneNumber || null,
            device_type: deviceType,
            is_active: true,
          })

        if (insertError) {
          console.error('[notifications/subscribe] Insert error:', insertError)
          return NextResponse.json(
            { error: 'Greška pri čuvanju tokena' },
            { status: 500 }
          )
        }
      }

      // Pretplati se na Firebase temu
      try {
        if (salonId) {
          await subscribeToTopic([deviceToken], `salon_${salonId}`)
        } else if (clientId || userId) {
          await subscribeToTopic([deviceToken], `user_${clientId || userId}`)
        }
      } catch (error) {
        console.error('[notifications/subscribe] Firebase error:', error)
        // Ne prekini izvršavanje, moglo je da se upiše u bazu
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Pretplaćeni ste na push notifikacije',
          deviceToken: deviceToken.substring(0, 20) + '...',
        },
        { status: 201 }
      )
    } else if (action === 'unsubscribe') {
      // Deaktiviraj token
      const { error: updateError } = await userClient
        .from('notification_tokens')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('push_token', deviceToken)

      if (updateError) {
        console.error('[notifications/subscribe] Unsubscribe error:', updateError)
        return NextResponse.json(
          { error: 'Greška pri otkazivanju pretplate' },
          { status: 500 }
        )
      }

      // Odjavi se sa Firebase teme
      try {
        if (salonId) {
          await unsubscribeFromTopic([deviceToken], `salon_${salonId}`)
        } else if (clientId || userId) {
          await unsubscribeFromTopic([deviceToken], `user_${clientId || userId}`)
        }
      } catch (error) {
        console.error('[notifications/subscribe] Firebase unsubscribe error:', error)
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Odjavljeni ste sa push notifikacija',
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('[notifications/subscribe] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Greška servera' },
      { status: 500 }
    )
  }
}

/**
 * GET - Proverite sve tokene korisnika
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const authToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null

    if (!authToken) {
      return NextResponse.json(
        { error: 'Nedostaje authorization header' },
        { status: 401 }
      )
    }

    const anonClient = getAnonClient()
    if (!anonClient) {
      return NextResponse.json(
        { error: 'Server nije konfigurisan' },
        { status: 500 }
      )
    }

    const { data: userData, error: userError } = await anonClient.auth.getUser(
      authToken
    )
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Nevažeća sesija' },
        { status: 401 }
      )
    }

    const userClient = getUserClient(authToken)
    if (!userClient) {
      return NextResponse.json(
        { error: 'Server nije konfigurisan' },
        { status: 500 }
      )
    }

    const { data: tokens, error: fetchError } = await userClient
      .from('notification_tokens')
      .select('*')
      .eq('client_id', userData.user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('[notifications/subscribe] GET error:', fetchError)
      return NextResponse.json(
        { error: 'Greška pri učitavanju tokena' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        tokens: tokens || [],
        count: tokens?.length || 0,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[notifications/subscribe] GET error:', error)
    return NextResponse.json(
      { error: 'Greška servera' },
      { status: 500 }
    )
  }
}
