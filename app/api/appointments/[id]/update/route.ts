// app/api/appointments/[id]/update/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPublicSupabaseEnv } from '@/lib/env-supabase'
import { sendToTopic, sendPushNotification } from '@/lib/notifications/firebase-config'
import {
  whatsappTemplates,
  formatters,
} from '@/lib/notifications/notification-templates'
import { sendNotificationToUser } from '@/lib/whatsapp/twilio-config'

export const dynamic = 'force-dynamic'

interface UpdateAppointmentBody {
  nova_vrijeme: string
  napomena?: string
  salon_id: string
  auth_token: string
}

function getAnonClient() {
  const { url, anonKey, ok } = getPublicSupabaseEnv()
  if (!ok) return null
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
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

/**
 * PATCH - Ažuriraj termin (samo korisnik može da menja svoje termine)
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const appointmentId = (await context.params).id
    const body: UpdateAppointmentBody = await request.json()

    const { nova_vrijeme, napomena, salon_id, auth_token } = body

    // Validacija
    if (!appointmentId || !nova_vrijeme || !salon_id || !auth_token) {
      return NextResponse.json(
        { error: 'Nedostaju obavezni podaci (id, nova_vrijeme, salon_id, auth_token)' },
        { status: 400 }
      )
    }

    const { url, anonKey, ok } = getPublicSupabaseEnv()
    if (!ok) {
      return NextResponse.json(
        { error: 'Server nije konfigurisan' },
        { status: 500 }
      )
    }

    // Proveraj da li korisnik postoji
    const anonClient = getAnonClient()
    if (!anonClient) {
      return NextResponse.json(
        { error: 'Server nije konfigurisan' },
        { status: 500 }
      )
    }

    const { data: userData, error: userError } = await anonClient.auth.getUser(auth_token)
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Nevažeća sesija. Prijavite se ponovo.' },
        { status: 401 }
      )
    }

    const userClient = getUserClient(auth_token)
    if (!userClient) {
      return NextResponse.json(
        { error: 'Server nije konfigurisan' },
        { status: 500 }
      )
    }

    // 1. Učitaj postojeći termin
    const { data: oldAppointment, error: fetchError } = await userClient
      .from('termini')
      .select('*, salon_clients(ime, telefon)')
      .eq('id', appointmentId)
      .eq('salon_id', salon_id)
      .single()

    if (fetchError || !oldAppointment) {
      return NextResponse.json(
        { error: 'Termin nije pronađen' },
        { status: 404 }
      )
    }

    // Provera - da li korisnik može da uredi termin (samo svoj, a samo ako je potvrđen)
    if (oldAppointment.client_id !== userData.user.id) {
      return NextResponse.json(
        { error: 'Nemate pristup da menjate ovaj termin' },
        { status: 403 }
      )
    }

    if (oldAppointment.status !== 'potvrđen') {
      return NextResponse.json(
        {
          error: 'Samo potvrđene termine možete menjati. Trenutni status: ' +
            oldAppointment.status,
        },
        { status: 400 }
      )
    }

    // 2. Validiraj novo vreme
    const newDateTime = new Date(nova_vrijeme)
    const now = new Date()
    const minimumAdvanceMinutes = 60 // Minimum 1 sat unapred

    if (newDateTime < new Date(now.getTime() + minimumAdvanceMinutes * 60000)) {
      return NextResponse.json(
        { error: 'Novi termin mora biti najmanje 1 sat od sada' },
        { status: 400 }
      )
    }

    // 3. Proveri dostupnost vremena
    const { data: conflictingAppointments } = await userClient
      .from('termini')
      .select('id')
      .eq('salon_id', salon_id)
      .eq('status', 'potvrđen')
      .neq('id', appointmentId) // Isključi sam termin
      .gte('datum_vrijeme', new Date(newDateTime.getTime() - 30 * 60000).toISOString()) // ±30 min
      .lte('datum_vrijeme', new Date(newDateTime.getTime() + 30 * 60000).toISOString())

    if (conflictingAppointments && conflictingAppointments.length > 0) {
      return NextResponse.json(
        { error: 'Novo vreme se preklapa sa drugim terminom' },
        { status: 409 }
      )
    }

    // 4. Ažuriraj termin u bazi
    const oldDateTime = oldAppointment.datum_vrijeme

    const { data: updatedAppointment, error: updateError } = await userClient
      .from('termini')
      .update({
        datum_vrijeme: nova_vrijeme,
        napomena: napomena || oldAppointment.napomena,
        updated_at: new Date().toISOString(),
        last_updated_by_client: true,
      })
      .eq('id', appointmentId)
      .select()
      .single()

    if (updateError) {
      console.error('[appointments/update] Update error:', updateError)
      return NextResponse.json(
        { error: 'Ažuriranje termina nije uspelo' },
        { status: 500 }
      )
    }

    // 5. Unesi u istoriju izmena
    await userClient.from('appointment_updates').insert({
      appointment_id: appointmentId,
      updated_by_role: 'korisnik',
      old_datetime: oldDateTime,
      new_datetime: nova_vrijeme,
      change_reason: napomena || null,
    })

    // 6. Pošalji notifikacije salonu
    // - Push notifikacija
    // - WhatsApp notifikacija

    const salonName = 'Salon Pro' // TODO: Učitaj pravo ime salona
    const clientName = oldAppointment.salon_clients?.ime || 'Korisnik'
    const clientPhone = oldAppointment.salon_clients?.telefon

    const formattedOldTime = formatters.dateTime(oldDateTime)
    const formattedNewTime = formatters.dateTime(nova_vrijeme)

    // Push notifikacija salonu (topic based)
    try {
      await sendToTopic(
        `salon_${salon_id}`,
        'Termin promenjen! 🔄',
        `${clientName}: sa ${formatters.timeOnly(oldDateTime)} na ${formatters.timeOnly(nova_vrijeme)}`,
        {
          appointmentId,
          type: 'appointment_updated_by_client',
          salonId: salon_id,
        }
      )
    } catch (error) {
      console.error('[appointments/update] Push notification error:', error)
      // Ne prekini izvršavanje, samo loguj grešku
    }

    // WhatsApp notifikacija salonu (ako je admin sačuvao svoj broj)
    // TODO: Učitaj admin broj salona iz baze
    const adminPhone = process.env.SALON_ADMIN_WHATSAPP_NUMBER
    if (adminPhone && clientPhone) {
      try {
        const whatsappMessage = whatsappTemplates.urgentAppointmentChange(
          clientName,
          formattedOldTime,
          formattedNewTime
        )
        await sendNotificationToUser(adminPhone, whatsappMessage, true)
      } catch (error) {
        console.error('[appointments/update] WhatsApp notification error:', error)
      }
    }

    // 7. Pošalji potvrdu korisniku
    try {
      const confirmationMessage = whatsappTemplates.appointmentUpdatedByAdmin(
        salonName,
        formattedOldTime,
        formattedNewTime,
        'Promenili ste vreme'
      )
      if (clientPhone) {
        await sendNotificationToUser(clientPhone, confirmationMessage, true)
      }
    } catch (error) {
      console.error('[appointments/update] Client confirmation error:', error)
    }

    return NextResponse.json(
      {
        success: true,
        appointment: updatedAppointment,
        message: 'Termin je uspešno ažuriran. Salon je obavešten.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[appointments/update] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Greška servera pri ažuriranju termina' },
      { status: 500 }
    )
  }
}

/**
 * GET - Provjeri dostupna vremena za određeni salon i datum
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const appointmentId = (await context.params).id
    const { searchParams } = new URL(request.url)
    const salon_id = searchParams.get('salon_id')
    const date = searchParams.get('date') // Format: YYYY-MM-DD

    if (!appointmentId || !salon_id || !date) {
      return NextResponse.json(
        { error: 'Nedostaju parametri: appointmentId, salon_id, date' },
        { status: 400 }
      )
    }

    const anonClient = getAnonClient()
    if (!anonClient) {
      return NextResponse.json(
        { error: 'Server nije konfigurisan' },
        { status: 500 }
      )
    }

    const startOfDay = new Date(`${date}T00:00:00Z`)
    const endOfDay = new Date(`${date}T23:59:59Z`)

    // Učitaj sve termine za taj dan
    const { data: appointmentsOnDay } = await anonClient
      .from('termini')
      .select('datum_vrijeme')
      .eq('salon_id', salon_id)
      .eq('status', 'potvrđen')
      .neq('id', appointmentId) // Isključi sam termin
      .gte('datum_vrijeme', startOfDay.toISOString())
      .lte('datum_vrijeme', endOfDay.toISOString())

    const bookedTimes = new Set(
      (appointmentsOnDay || []).map((apt) =>
        formatters.timeOnly(apt.datum_vrijeme)
      )
    )

    // Generiši dostupna vremena (svaki sat od 8:00 do 18:00)
    const availableSlots: string[] = []
    const currentHour = new Date().getHours()
    const currentDate = new Date()
    const selectedDate = new Date(`${date}T00:00:00Z`)

    for (let hour = 8; hour < 18; hour++) {
      const timeString = `${String(hour).padStart(2, '0')}:00`
      const slotDate = new Date(selectedDate)
      slotDate.setHours(hour, 0, 0, 0)

      // Preskoči vremenske slotove koji su u prošlosti
      if (
        selectedDate.toDateString() === currentDate.toDateString() &&
        hour <= currentHour
      ) {
        continue
      }

      if (!bookedTimes.has(timeString)) {
        availableSlots.push(timeString)
      }
    }

    return NextResponse.json(
      {
        date,
        availableSlots,
        bookedSlots: Array.from(bookedTimes),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[appointments/update] GET error:', error)
    return NextResponse.json(
      { error: 'Greška pri učitavanju dostupnih vremena' },
      { status: 500 }
    )
  }
}
