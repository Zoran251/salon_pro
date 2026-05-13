// lib/notifications/firebase-config.ts

import * as admin from 'firebase-admin'

let firebaseApp: admin.app.App | null = null

export function isFirebasePushConfigured(): boolean {
  return Boolean(process.env.FIREBASE_ADMIN_SDK_KEY?.trim())
}

/**
 * Inicijalizuj Firebase Admin SDK ako postoji FIREBASE_ADMIN_SDK_KEY.
 */
export function initializeFirebase(): admin.app.App | null {
  if (!isFirebasePushConfigured()) return null
  if (firebaseApp) return firebaseApp

  const serviceAccountJson = process.env.FIREBASE_ADMIN_SDK_KEY
  if (!serviceAccountJson) return null

  let serviceAccount: admin.ServiceAccount
  try {
    serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount
  } catch {
    console.error('[Firebase] FIREBASE_ADMIN_SDK_KEY nije validan JSON')
    return null
  }

  if (!admin.apps.length) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  } else {
    firebaseApp = admin.app()
  }
  return firebaseApp
}

export function getFirebaseMessaging(): admin.messaging.Messaging | null {
  const app = initializeFirebase()
  if (!app) return null
  return admin.messaging(app)
}

export async function sendPushNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  const messaging = getFirebaseMessaging()
  if (!messaging) {
    console.warn('[Firebase] sendPushNotification: preskočeno (nema konfiguracije)')
    return { success: false, skipped: true as const }
  }

  const response = await messaging.send({
    notification: { title, body },
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
          alert: { title, body },
          sound: 'default',
          badge: 1,
        },
      },
    },
    token: deviceToken,
  })

  console.log('[Firebase] Notifikacija poslata:', response)
  return { success: true, messageId: response }
}

export async function sendMulticastNotification(
  deviceTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  const messaging = getFirebaseMessaging()
  if (!messaging) {
    return { success: false, skipped: true as const, successCount: 0, failureCount: deviceTokens.length, failures: [] }
  }

  const response = await messaging.sendEachForMulticast({
    tokens: deviceTokens,
    notification: { title, body },
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
          alert: { title, body },
          sound: 'default',
          badge: 1,
        },
      },
    },
  })

  return {
    success: true,
    successCount: response.successCount,
    failureCount: response.failureCount,
    failures: response.responses
      .map((r, i) => (!r.success ? { token: deviceTokens[i], error: r.error } : null))
      .filter(Boolean),
  }
}

export async function unsubscribeFromTopic(deviceTokens: string[], topic: string) {
  const messaging = getFirebaseMessaging()
  if (!messaging) return { success: false, skipped: true as const }
  await messaging.unsubscribeFromTopic(deviceTokens, topic)
  return { success: true }
}

export async function subscribeToTopic(deviceTokens: string[], topic: string) {
  const messaging = getFirebaseMessaging()
  if (!messaging) return { success: false, skipped: true as const }
  await messaging.subscribeToTopic(deviceTokens, topic)
  return { success: true }
}

export async function sendToTopic(topic: string, title: string, body: string, data?: Record<string, string>) {
  const messaging = getFirebaseMessaging()
  if (!messaging) {
    console.warn('[Firebase] sendToTopic: preskočeno (nema konfiguracije)', topic)
    return { success: false, skipped: true as const }
  }

  const response = await messaging.send({
    notification: { title, body },
    data: data || {},
    webpush: {
      notification: {
        title,
        body,
        icon: '/icon.png',
        badge: '/badge-icon.png',
      },
    },
    topic,
  })

  return { success: true, messageId: response }
}
