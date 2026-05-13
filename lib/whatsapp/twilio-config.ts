/**
 * Twilio/WhatsApp nije uključen u bundle dok nema paketa i ključeva.
 * API rute mogu pozivati ove funkcije; vraćaju skipped bez slanja.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

export async function sendWhatsAppMessage(
  _toPhoneNumber: string,
  _messageBody: string,
  _mediaUrl?: string,
): Promise<{ success: boolean; skipped?: boolean }> {
  console.warn('[Twilio] sendWhatsAppMessage: stub (nema integracije)')
  return { success: false, skipped: true }
}

export async function sendSMS(
  _toPhoneNumber: string,
  _messageBody: string,
): Promise<{ success: boolean; skipped?: boolean }> {
  console.warn('[Twilio] sendSMS: stub (nema integracije)')
  return { success: false, skipped: true }
}

export async function getMessageStatus(_messageSid: string) {
  console.warn('[Twilio] getMessageStatus: stub')
  return { status: 'unknown' as const }
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
  _preferWhatsApp: boolean = true,
): Promise<{ success: boolean; skipped?: boolean }> {
  console.warn('[Twilio] sendNotificationToUser: stub', formatPhoneNumber(phoneNumber).slice(0, 6), message.length)
  return { success: false, skipped: true }
}

export async function sendUrgentSalonNotification(
  phoneNumber: string,
  message: string,
): Promise<{ success: boolean; skipped?: boolean }> {
  console.warn('[Twilio] sendUrgentSalonNotification: stub', phoneNumber.slice(0, 4))
  return { success: false, skipped: true }
}
