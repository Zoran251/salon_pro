/**
 * WhatsApp/SMS preko Twilio-a — opciono na produkciji.
 * Bez instaliranog `twilio` paketa modul mora ostati čist da Vercel build prolazi.
 * Kada dodate `twilio` u dependencies i env ključeve, zamenite ovaj fajl punom integracijom.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

export async function sendWhatsAppMessage(
  _toPhoneNumber: string,
  _messageBody: string,
  _mediaUrl?: string,
): Promise<{ success: boolean; skipped?: boolean; messageSid?: string; status?: string }> {
  console.warn('[Twilio] sendWhatsAppMessage: stub (nema integracije / paketa twilio)')
  return { success: false, skipped: true }
}

export async function sendSMS(
  _toPhoneNumber: string,
  _messageBody: string,
): Promise<{ success: boolean; skipped?: boolean; messageSid?: string; status?: string }> {
  console.warn('[Twilio] sendSMS: stub (nema integracije / paketa twilio)')
  return { success: false, skipped: true }
}

export async function getMessageStatus(_messageSid: string): Promise<{
  status?: string
  dateCreated?: Date | null
  dateSent?: Date | null
  dateUpdated?: Date | null
  errorCode?: number | null
  errorMessage?: string | null
}> {
  console.warn('[Twilio] getMessageStatus: stub')
  return { status: 'unknown' }
}

export function formatPhoneNumber(phoneNumber: string): string {
  let cleaned = phoneNumber.replace(/[^\d+]/g, '')
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      cleaned = '+381' + cleaned.substring(1)
    } else {
      cleaned = '+' + cleaned
    }
  }
  return cleaned
}

export async function sendNotificationToUser(
  phoneNumber: string,
  message: string,
  preferWhatsApp: boolean = true,
): Promise<{ success: boolean; skipped?: boolean; messageSid?: string; status?: string }> {
  const formattedPhone = formatPhoneNumber(phoneNumber)
  if (preferWhatsApp) {
    return sendWhatsAppMessage(formattedPhone, message)
  }
  return sendSMS(formattedPhone, message)
}

export async function sendUrgentSalonNotification(
  phoneNumber: string,
  message: string,
): Promise<{ success: boolean; skipped?: boolean; messageSid?: string; status?: string }> {
  return sendWhatsAppMessage(formatPhoneNumber(phoneNumber), '🚨 ' + message)
}
