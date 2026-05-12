// lib/notifications/firebase-config.ts
// Push (FCM) preko Firebase Admin SDK. Na Vercelu postavi FIREBASE_ADMIN_SDK_KEY (JSON string servisnog naloga).

import admin from 'firebase-admin'
import type { ServiceAccount } from 'firebase-admin'

let firebaseApp: admin.app.App | null = null

export function isFirebasePushConfigured(): boolean {
  return Boolean(process.env.FIREBASE_ADMIN_SDK_KEY?.trim())
}

/**
 * Inicijalizuj Firebase Admin SDK ako postoji FIREBASE_ADMIN_SDK_KEY.
 */
export function initializeFirebase(): admin.app.App | null {
  if (!isFirebasePushConfigured()) {
    return null
  }

  if (firebaseApp) {
    return firebaseApp
  }

  const serviceAccountJson = process.env.FIREBASE_ADMIN_SDK_KEY as string

  let serviceAccount: ServiceAccount
  try {
    serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount
  } catch {
    console.error('[Firebase] FIREBASE_ADMIN_SDK_KEY nije validan JSON')
    return null
  }

  try {
    if (admin.apps.length > 0) {
      firebaseApp = admin.app()
    } else {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    }
  } catch (e) {
    console.error('[Firebase] Inicijalizacija nije uspela:', e)
    return null
  }

  return firebaseApp
}

export function getFirebaseMessaging(): admin.messaging.Messaging | null {
  const app = initializeFirebase()
  if (!app) return null
  return admin.messaging(app)
}

export type PushSendResult =
  | { success: true; messageId: string }
  | { success: false; skipped: true; reason: 'firebase_not_configured' }
  | { success: false; error: unknown }

/**
 * Pošalji push notifikaciju na jedan device
 */
export async function sendPushNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<PushSendResult> {
  const messaging = getFirebaseMessaging()
  if (!messaging) {
    console.warn('[Firebase] sendPushNotification: preskočeno (nema FIREBASE_ADMIN_SDK_KEY)')
    return { success: false, skipped: true, reason: 'firebase_not_configured' }
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        notification: {
          title,
          body,
          icon: '/icon.png',
          badge: '/badge-icon.png',
          vibrate: [100, 50, 100],
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },
    }

    const messageId = await messaging.send({
      ...message,
      token: deviceToken,
    })

    console.log('[Firebase] Notifikacija poslata:', messageId)
    return { success: true, messageId }
  } catch (error) {
    console.error('[Firebase] Greška pri slanju notifikacije:', error)
    return { success: false, error }
  }
}

/**
 * Pošalji push notifikaciju na više devices
 */
export async function sendMulticastNotification(
  deviceTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  const messaging = getFirebaseMessaging()
  if (!messaging) {
    console.warn('[Firebase] sendMulticastNotification: preskočeno (nema FIREBASE_ADMIN_SDK_KEY)')
    return { success: false, skipped: true as const, reason: 'firebase_not_configured' as const }
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        notification: {
          title,
          body,
          icon: '/icon.png',
          badge: '/badge-icon.png',
          vibrate: [100, 50, 100],
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },
    }

    const response = await messaging.sendEachForMulticast({
      ...message,
      tokens: deviceTokens,
    })

    console.log('[Firebase] Multicast notifikacije poslate:', {
      success: response.successCount,
      failure: response.failureCount,
    })

    return {
      success: true as const,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failures: response.responses
        .map((r, i) => (!r.success ? { token: deviceTokens[i], error: r.error } : null))
        .filter(Boolean),
    }
  } catch (error) {
    console.error('[Firebase] Greška pri slanju multicast notifikacija:', error)
    throw error
  }
}

export async function unsubscribeFromTopic(deviceTokens: string[], topic: string) {
  const messaging = getFirebaseMessaging()
  if (!messaging) {
    console.warn('[Firebase] unsubscribeFromTopic: preskočeno (nema FIREBASE_ADMIN_SDK_KEY)')
    return { success: false, skipped: true as const }
  }

  try {
    await messaging.unsubscribeFromTopic(deviceTokens, topic)
    console.log('[Firebase] Odjavljena notifikacija sa teme:', topic)
    return { success: true as const }
  } catch (error) {
    console.error('[Firebase] Greška pri odjavi sa teme:', error)
    throw error
  }
}

export async function subscribeToTopic(deviceTokens: string[], topic: string) {
  const messaging = getFirebaseMessaging()
  if (!messaging) {
    console.warn('[Firebase] subscribeToTopic: preskočeno (nema FIREBASE_ADMIN_SDK_KEY)')
    return { success: false, skipped: true as const }
  }

  try {
    await messaging.subscribeToTopic(deviceTokens, topic)
    console.log('[Firebase] Pretplaćena notifikacija na temu:', topic)
    return { success: true as const }
  } catch (error) {
    console.error('[Firebase] Greška pri pretplati na temu:', error)
    throw error
  }
}

export async function sendToTopic(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<PushSendResult> {
  const messaging = getFirebaseMessaging()
  if (!messaging) {
    console.warn('[Firebase] sendToTopic: preskočeno (nema FIREBASE_ADMIN_SDK_KEY)')
    return { success: false, skipped: true, reason: 'firebase_not_configured' }
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        notification: {
          title,
          body,
          icon: '/icon.png',
          badge: '/badge-icon.png',
        },
      },
    }

    const messageId = await messaging.send({
      ...message,
      topic,
    })

    console.log('[Firebase] Notifikacija na temu poslata:', messageId)
    return { success: true, messageId }
  } catch (error) {
    console.error('[Firebase] Greška pri slanju notifikacije na temu:', error)
    return { success: false, error }
  }
}
