// lib/whatsapp/twilio-config.ts
//
// WhatsApp/SMS preko Twilio-a — dodaje se posebno (npm install twilio + TWILIO_* u Vercel okruženju).
// Ovaj modul ne importuje `twilio` da bi `next build` prolazio bez tog paketa.

export type ChannelSendResult =
  | { success: true; messageSid?: string; status?: string }
  | { success: false; skipped: true; reason: 'whatsapp_not_integrated' }

function logSkipped(context: string) {
  console.info(
    `[WhatsApp/Twilio] ${context}: preskočeno — integracija nije uključena. ` +
      'Kada budete spremni: npm install twilio, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER.',
  )
}

/**
 * Pošalji WhatsApp poruku (Twilio) — stub dok se ne doda paket i ključevi.
 */
export async function sendWhatsAppMessage(
  toPhoneNumber: string,
  messageBody: string,
  mediaUrl?: string,
): Promise<ChannelSendResult> {
  void toPhoneNumber
  void messageBody
  void mediaUrl
  logSkipped('sendWhatsAppMessage')
  return { success: false, skipped: true, reason: 'whatsapp_not_integrated' }
}

/**
 * Pošalji SMS (Twilio) — stub.
 */
export async function sendSMS(toPhoneNumber: string, messageBody: string): Promise<ChannelSendResult> {
  void toPhoneNumber
  void messageBody
  logSkipped('sendSMS')
  return { success: false, skipped: true, reason: 'whatsapp_not_integrated' }
}

/**
 * Provjeri status poruke — stub.
 */
export async function getMessageStatus(messageSid: string) {
  void messageSid
  logSkipped('getMessageStatus')
  return null
}

/**
 * Validiraj / normalizuj broj telefona (bez mrežnog poziva).
 */
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

/**
 * Pošalji notifikaciju korisniku (WhatsApp ili SMS) — stub.
 */
export async function sendNotificationToUser(
  phoneNumber: string,
  message: string,
  preferWhatsApp: boolean = true,
): Promise<ChannelSendResult> {
  void formatPhoneNumber(phoneNumber)
  void message
  void preferWhatsApp
  logSkipped('sendNotificationToUser')
  return { success: false, skipped: true, reason: 'whatsapp_not_integrated' }
}

/**
 * Hitna notifikacija salonu — stub.
 */
export async function sendUrgentSalonNotification(
  phoneNumber: string,
  message: string,
): Promise<ChannelSendResult> {
  void formatPhoneNumber(phoneNumber)
  void message
  logSkipped('sendUrgentSalonNotification')
  return { success: false, skipped: true, reason: 'whatsapp_not_integrated' }
}
