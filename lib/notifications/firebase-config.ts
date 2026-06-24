// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firebaseApp: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let messaging: any = null

function getFirebaseCredentials(): Record<string, string> | null {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim()
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim()
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim()
    if (!projectId || !clientEmail || !privateKey) return null
    return { projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }
  } catch { return null }
}

async function ensureFirebase(): Promise<boolean> {
  if (firebaseApp) return true
  const creds = getFirebaseCredentials()
  if (!creds) return false
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const admin = require('firebase-admin')
    if (admin.getApps().length === 0) {
      firebaseApp = admin.initializeApp({ credential: admin.credential.cert(creds) })
    } else {
      firebaseApp = admin.getApps()[0]
    }
    messaging = admin.messaging()
    return true
  } catch (e) {
    console.warn('[Firebase] init failed:', e instanceof Error ? e.message : e)
    return false
  }
}

export async function sendPushNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: boolean; skipped?: boolean; messageId?: string }> {
  const ready = await ensureFirebase()
  if (!ready || !messaging) return { success: false, skipped: true }
  try {
    const messageId = await messaging.send({ token: deviceToken, notification: { title, body }, data })
    return { success: true, messageId }
  } catch (e) {
    console.error('[Firebase] sendPushNotification error:', e instanceof Error ? e.message : e)
    return { success: false, skipped: false }
  }
}

export async function sendMulticastNotification(
  deviceTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{
  success: boolean
  skipped?: boolean
  successCount?: number
  failureCount?: number
  failures?: Array<{ index: number; error: string }>
}> {
  const ready = await ensureFirebase()
  if (!ready || !messaging) return { success: false, skipped: true }
  try {
    const response = await messaging.sendEachForMulticast({
      tokens: deviceTokens,
      notification: { title, body },
      data,
    })
    const failures: Array<{ index: number; error: string }> = []
    if (response.failureCount > 0) {
      response.responses.forEach((resp: { success: boolean; error?: { message: string } }, idx: number) => {
        if (!resp.success) {
          failures.push({ index: idx, error: resp.error?.message || 'Unknown' })
        }
      })
    }
    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failures,
    }
  } catch (e) {
    console.error('[Firebase] sendMulticastNotification error:', e instanceof Error ? e.message : e)
    return { success: false, skipped: false }
  }
}

export async function subscribeToTopic(
  deviceTokens: string[],
  topic: string,
): Promise<{ success: boolean; skipped?: boolean }> {
  const ready = await ensureFirebase()
  if (!ready || !messaging) return { success: false, skipped: true }
  try {
    await messaging.subscribeToTopic(deviceTokens, topic)
    return { success: true }
  } catch (e) {
    console.error('[Firebase] subscribeToTopic error:', e instanceof Error ? e.message : e)
    return { success: false }
  }
}

export async function unsubscribeFromTopic(
  deviceTokens: string[],
  topic: string,
): Promise<{ success: boolean; skipped?: boolean }> {
  const ready = await ensureFirebase()
  if (!ready || !messaging) return { success: false, skipped: true }
  try {
    await messaging.unsubscribeFromTopic(deviceTokens, topic)
    return { success: true }
  } catch (e) {
    console.error('[Firebase] unsubscribeFromTopic error:', e instanceof Error ? e.message : e)
    return { success: false }
  }
}

export async function sendToTopic(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: boolean; skipped?: boolean; messageId?: string }> {
  const ready = await ensureFirebase()
  if (!ready || !messaging) return { success: false, skipped: true }
  try {
    const messageId = await messaging.send({ topic, notification: { title, body }, data })
    return { success: true, messageId }
  } catch (e) {
    console.error('[Firebase] sendToTopic error:', e instanceof Error ? e.message : e)
    return { success: false }
  }
}
