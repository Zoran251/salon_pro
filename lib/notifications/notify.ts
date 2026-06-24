import { sendTransactionalEmail } from '@/lib/email/salon-admin-notify'
import { sendPushNotification, sendMulticastNotification } from '@/lib/notifications/firebase-config'
import { getServerSupabaseClient } from '@/lib/server-supabase'
import { formatDatumVrijemeBelgrad } from '@/lib/termin-belgrade-vreme'

async function getDeviceTokensForUser(userId: string): Promise<string[]> {
  const srv = getServerSupabaseClient()
  if (!srv) return []
  const { data } = await srv.from('device_tokens').select('token').eq('user_id', userId)
  return (data || []).map(r => r.token).filter(Boolean)
}

async function getDeviceTokensForSalon(salonId: string): Promise<string[]> {
  const srv = getServerSupabaseClient()
  if (!srv) return []
  const { data } = await srv.from('device_tokens').select('token').eq('salon_id', salonId)
  return (data || []).map(r => r.token).filter(Boolean)
}

export async function notifyNewAppointment(params: {
  salonId: string
  salonNaziv: string
  salonEmail: string
  klijentIme: string
  klijentTelefon: string
  klijentEmail: string
  uslugaNaziv: string | null
  datumVrijeme: string
}) {
  const when = formatDatumVrijemeBelgrad(params.datumVrijeme)

  const emailText = [
    'Novi termin!',
    '',
    `Salon: ${params.salonNaziv}`,
    `Klijent: ${params.klijentIme}`,
    `Telefon: ${params.klijentTelefon}`,
    ...(params.klijentEmail ? [`Email: ${params.klijentEmail}`] : []),
    ...(params.uslugaNaziv ? [`Usluga: ${params.uslugaNaziv}`] : []),
    `Datum i vrijeme: ${when}`,
    '',
    'Provjerite dashboard za više detalja.',
  ].join('\n')

  await sendTransactionalEmail({
    to: params.salonEmail,
    subject: `Novi termin — ${params.salonNaziv}`,
    text: emailText,
  })

  const salonTokens = await getDeviceTokensForSalon(params.salonId)
  if (salonTokens.length > 0) {
    await sendMulticastNotification(
      salonTokens,
      'Novi termin! 📅',
      `${params.klijentIme}${params.uslugaNaziv ? ` — ${params.uslugaNaziv}` : ''} na ${when}`,
      { type: 'new_appointment', salon_id: params.salonId },
    )
  }
}

export async function notifyAppointmentConfirmed(params: {
  salonId: string
  salonNaziv: string
  klijentIme: string
  klijentEmail: string
  klijentUserId: string | null
  uslugaNaziv: string | null
  datumVrijeme: string
}) {
  const when = formatDatumVrijemeBelgrad(params.datumVrijeme)

  if (params.klijentEmail) {
    const text = [
      `Poštovani/a ${params.klijentIme},`,
      '',
      `Vaš termin u salonu "${params.salonNaziv}" je potvrđen.`,
      '',
      ...(params.uslugaNaziv ? [`Usluga: ${params.uslugaNaziv}`] : []),
      `Datum i vrijeme: ${when}`,
      '',
      'Hvala na povjerenju!',
      '— SalonPro',
    ].join('\n')

    await sendTransactionalEmail({
      to: params.klijentEmail,
      subject: `Termin potvrđen — ${params.salonNaziv}`,
      text,
    })
  }

  if (params.klijentUserId) {
    const klijentTokens = await getDeviceTokensForUser(params.klijentUserId)
    if (klijentTokens.length > 0) {
      await sendMulticastNotification(
        klijentTokens,
        `Termin potvrđen ✓ — ${params.salonNaziv}`,
        `${params.uslugaNaziv || 'Termin'} na ${when}`,
        { type: 'appointment_confirmed', salon_id: params.salonId },
      )
    }
  }
}

export async function notifyAppointmentCancelled(params: {
  salonId: string
  salonNaziv: string
  klijentIme: string
  klijentEmail: string
  klijentUserId: string | null
  uslugaNaziv: string | null
  datumVrijeme: string
}) {
  const when = formatDatumVrijemeBelgrad(params.datumVrijeme)

  if (params.klijentEmail) {
    const text = [
      `Poštovani/a ${params.klijentIme},`,
      '',
      `Vaš termin u salonu "${params.salonNaziv}" je otkazan.`,
      '',
      ...(params.uslugaNaziv ? [`Usluga: ${params.uslugaNaziv}`] : []),
      `Datum i vrijeme: ${when}`,
      '',
      'Možete zakazati novi termin putem naše stranice.',
      '— SalonPro',
    ].join('\n')

    await sendTransactionalEmail({
      to: params.klijentEmail,
      subject: `Termin otkazan — ${params.salonNaziv}`,
      text,
    })
  }

  if (params.klijentUserId) {
    const klijentTokens = await getDeviceTokensForUser(params.klijentUserId)
    if (klijentTokens.length > 0) {
      await sendMulticastNotification(
        klijentTokens,
        `Termin otkazan ❌ — ${params.salonNaziv}`,
        `${params.uslugaNaziv || 'Termin'} na ${when}`,
        { type: 'appointment_cancelled', salon_id: params.salonId },
      )
    }
  }
}
