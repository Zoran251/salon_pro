import webPush from 'web-push'

let initialized = false

function init() {
  if (initialized) return
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@salonpro.com'

  if (!publicKey || !privateKey) {
    console.warn('[web-push] VAPID ključevi nisu podešeni.')
    return
  }

  webPush.setVapidDetails(subject, publicKey, privateKey)
  initialized = true
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

export async function sendPush(subscription: { endpoint: string; keys: { auth: string; p256dh: string } }, payload: { title: string; body: string; url?: string }) {
  init()
  if (!initialized) return { success: false, skipped: true }

  try {
    const result = await webPush.sendNotification(subscription, JSON.stringify(payload), { TTL: 86400 })
    return { success: result.statusCode === 201, statusCode: result.statusCode }
  } catch (err: unknown) {
    if (err instanceof webPush.WebPushError) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        return { success: false, expired: true, statusCode: err.statusCode }
      }
      return { success: false, error: err.message, statusCode: err.statusCode }
    }
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function sendPushToSubscriptions(
  subscriptions: Array<{ endpoint: string; auth_key: string; p256dh_key: string }>,
  payload: { title: string; body: string; url?: string },
  onExpired?: (endpoint: string) => void,
) {
  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      sendPush(
        { endpoint: sub.endpoint, keys: { auth: sub.auth_key, p256dh: sub.p256dh_key } },
        payload,
      ),
    ),
  )

  const expired: string[] = []

  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.expired) {
      expired.push(subscriptions[i].endpoint)
    }
  })

  if (expired.length > 0 && onExpired) {
    expired.forEach(ep => onExpired(ep))
  }

  return { sent: results.filter(r => r.status === 'fulfilled' && r.value.success).length, expired }
}
