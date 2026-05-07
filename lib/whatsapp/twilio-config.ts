// lib/whatsapp/twilio-config.ts

import twilio from 'twilio'

let twilioClient: ReturnType<typeof twilio> | null = null

/**
 * Inicijalizuj Twilio klijent
 */
function getTwilioClient() {
  if (twilioClient) {
    return twilioClient
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error(
      'TWILIO_ACCOUNT_SID i TWILIO_AUTH_TOKEN nisu postavljeni u environment varijablama'
    )
  }

  twilioClient = twilio(accountSid, authToken)
  return twilioClient
}

/**
 * Pošalji WhatsApp poruku
 */
export async function sendWhatsAppMessage(
  toPhoneNumber: string,
  messageBody: string,
  mediaUrl?: string
) {
  const client = getTwilioClient()
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155552671'

  // Validacija broja telefona
  if (!toPhoneNumber.startsWith('+')) {
    throw new Error(
      'Broj telefona mora biti u internacionalnom formatu (npr: +381601234567)'
    )
  }

  try {
    const messageData: any = {
      from: fromNumber,
      to: `whatsapp:${toPhoneNumber}`,
      body: messageBody,
    }

    if (mediaUrl) {
      messageData.mediaUrl = mediaUrl
    }

    const message = await client.messages.create(messageData)

    console.log('[Twilio] WhatsApp poruka poslata:', {
      sid: message.sid,
      to: message.to,
      status: message.status,
    })

    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
    }
  } catch (error) {
    console.error('[Twilio] Greška pri slanju WhatsApp poruke:', error)
    throw error
  }
}

/**
 * Pošalji SMS kao fallback (ako WhatsApp ne radi)
 */
export async function sendSMS(
  toPhoneNumber: string,
  messageBody: string
) {
  const client = getTwilioClient()
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER

  if (!fromNumber) {
    throw new Error('TWILIO_PHONE_NUMBER nije postavljen')
  }

  if (!toPhoneNumber.startsWith('+')) {
    throw new Error(
      'Broj telefona mora biti u internacionalnom formatu (npr: +381601234567)'
    )
  }

  try {
    const message = await client.messages.create({
      from: fromNumber,
      to: toPhoneNumber,
      body: messageBody,
    })

    console.log('[Twilio] SMS poruka poslata:', {
      sid: message.sid,
      to: message.to,
      status: message.status,
    })

    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
    }
  } catch (error) {
    console.error('[Twilio] Greška pri slanju SMS-a:', error)
    throw error
  }
}

/**
 * Provjeri status poruke
 */
export async function getMessageStatus(messageSid: string) {
  const client = getTwilioClient()

  try {
    const message = await client.messages(messageSid).fetch()

    return {
      status: message.status,
      dateCreated: message.dateCreated,
      dateSent: message.dateSent,
      dateUpdated: message.dateUpdated,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
    }
  } catch (error) {
    console.error('[Twilio] Greška pri provjeri statusa poruke:', error)
    throw error
  }
}

/**
 * Validiraj broj telefona
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Ukloni sve znakove osim brojeva i +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '')

  // Ako nema +, dodaj ga
  if (!cleaned.startsWith('+')) {
    // Pretpostavi +381 za Srbiju ako nema koda
    if (cleaned.startsWith('0')) {
      cleaned = '+381' + cleaned.substring(1)
    } else {
      cleaned = '+' + cleaned
    }
  }

  return cleaned
}

/**
 * Pošalji notifikaciju korisnikу (WhatsApp ili SMS)
 */
export async function sendNotificationToUser(
  phoneNumber: string,
  message: string,
  preferWhatsApp: boolean = true
) {
  const formattedPhone = formatPhoneNumber(phoneNumber)

  try {
    if (preferWhatsApp) {
      // Prvo pokušaj WhatsApp
      return await sendWhatsAppMessage(formattedPhone, message)
    } else {
      // Ako ne želi WhatsApp, pošalji SMS
      return await sendSMS(formattedPhone, message)
    }
  } catch (error) {
    console.error('[Twilio] Greška pri slanju notifikacije:', error)
    // Ako WhatsApp ne radi, pokušaj sa SMS-om
    if (preferWhatsApp) {
      try {
        console.log('[Twilio] Padback na SMS...')
        return await sendSMS(formattedPhone, message)
      } catch (smsError) {
        console.error('[Twilio] SMS fallback nije radio:', smsError)
        throw smsError
      }
    }
    throw error
  }
}

/**
 * Pošalji notifikaciju salonu sa visokim prioritetom
 */
export async function sendUrgentSalonNotification(
  phoneNumber: string,
  message: string
) {
  const formattedPhone = formatPhoneNumber(phoneNumber)

  // Za salon, uvek koristi WhatsApp jer je brže
  try {
    return await sendWhatsAppMessage(
      formattedPhone,
      '🚨 ' + message // Dodaj emoji za hitan slučaj
    )
  } catch (error) {
    console.error('[Twilio] Greška pri slanju hitne notifikacije salonu:', error)
    throw error
  }
}
