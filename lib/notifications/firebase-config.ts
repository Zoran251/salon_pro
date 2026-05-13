/**
 * Firebase Admin push — opciono.
 * Bez `firebase-admin` u dependencies ostaje stub da build (Vercel) uvek prolazi.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

export function initializeFirebase(): null {
  return null
}

export function getFirebaseMessaging(): null {
  return null
}

export async function sendPushNotification(
  _deviceToken: string,
  _title: string,
  _body: string,
  _data?: Record<string, string>,
): Promise<{ success: boolean; skipped?: boolean; messageId?: string }> {
  console.warn('[Firebase] sendPushNotification: stub (nema firebase-admin)')
  return { success: false, skipped: true }
}

export async function sendMulticastNotification(
  _deviceTokens: string[],
  _title: string,
  _body: string,
  _data?: Record<string, string>,
): Promise<{
  success: boolean
  skipped?: boolean
  successCount?: number
  failureCount?: number
  failures?: unknown[]
}> {
  console.warn('[Firebase] sendMulticastNotification: stub')
  return { success: false, skipped: true, successCount: 0, failureCount: 0, failures: [] }
}

export async function unsubscribeFromTopic(
  _deviceTokens: string[],
  _topic: string,
): Promise<{ success: boolean; skipped?: boolean }> {
  return { success: false, skipped: true }
}

export async function subscribeToTopic(
  _deviceTokens: string[],
  _topic: string,
): Promise<{ success: boolean; skipped?: boolean }> {
  return { success: false, skipped: true }
}

export async function sendToTopic(
  _topic: string,
  _title: string,
  _body: string,
  _data?: Record<string, string>,
): Promise<{ success: boolean; skipped?: boolean; messageId?: string }> {
  return { success: false, skipped: true }
}
