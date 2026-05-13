// lib/notifications/firebase-config.ts

import admin from 'firebase-admin'

let firebaseApp: admin.app.App | null = null

/**
 * Inicijalizuj Firebase Admin SDK
 * Potrebni environment varijable:
 * - FIREBASE_ADMIN_SDK_KEY (JSON stringifikovani)
 */
export function initializeFirebase(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp
  }

  const serviceAccountJson = process.env.FIREBASE_ADMIN_SDK_KEY

  if (!serviceAccountJson) {
    throw new Error(
      'FIREBASE_ADMIN_SDK_KEY nije postavljen u environment varijablama'
    )
  }

  let serviceAccount: any
  try {
    serviceAccount = JSON.parse(serviceAccountJson)
  } catch (error) {
    throw new Error('FIREBASE_ADMIN_SDK_KEY nije validan JSON')
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })

  return firebaseApp
}

/**
 * Dobij Firebase Messaging instancu
 */
export function getFirebaseMessaging(): admin.messaging.Messaging {
  const app = initializeFirebase()
  return admin.messaging(app)
}

/**
 * Pošalji push notifikaciju na jedan device
 */
export async function sendPushNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const messaging = getFirebaseMessaging()

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

    const response = await messaging.send({
      ...message,
      token: deviceToken,
    })

    console.log('[Firebase] Notifikacija poslata:', response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('[Firebase] Greška pri slanju notifikacije:', error)
    throw error
  }
}

/**
 * Pošalji push notifikaciju na više devices
 */
export async function sendMulticastNotification(
  deviceTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const messaging = getFirebaseMessaging()

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

    const response = await messaging.sendMulticast({
      ...message,
      tokens: deviceTokens,
    })

    console.log('[Firebase] Multicast notifikacije poslate:', {
      success: response.successCount,
      failure: response.failureCount,
    })

    return {
      success: true,
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

/**
 * Unakaženi token (npr. korisnik je deinstalirao app)
 */
export async function unsubscribeFromTopic(
  deviceTokens: string[],
  topic: string
) {
  const messaging = getFirebaseMessaging()

  try {
    const response = await messaging.unsubscribeFromTopic(deviceTokens, topic)
    console.log('[Firebase] Odjavljena notifikacija sa teme:', topic)
    return { success: true }
  } catch (error) {
    console.error('[Firebase] Greška pri odjavi sa teme:', error)
    throw error
  }
}

/**
 * Pretplata tokena na temu (npr. salon ID)
 */
export async function subscribeToTopic(deviceTokens: string[], topic: string) {
  const messaging = getFirebaseMessaging()

  try {
    const response = await messaging.subscribeToTopic(deviceTokens, topic)
    console.log('[Firebase] Pretplaćena notifikacija na temu:', topic)
    return { success: true }
  } catch (error) {
    console.error('[Firebase] Greška pri pretplati na temu:', error)
    throw error
  }
}

/**
 * Pošalji notifikaciju svim korisnicima teme (npr. salon)
 */
export async function sendToTopic(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const messaging = getFirebaseMessaging()

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

    const response = await messaging.send({
      ...message,
      topic,
    })

    console.log('[Firebase] Notifikacija na temu poslata:', response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('[Firebase] Greška pri slanju notifikacije na temu:', error)
    throw error
  }
}
