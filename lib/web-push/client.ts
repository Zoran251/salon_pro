'use client'

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[push] Service Worker ili Push API nije podržan.')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    console.log('[push] Service Worker registrovan:', registration.scope)
    return registration
  } catch (err) {
    console.error('[push] Greška pri registraciji SW:', err)
    return null
  }
}

export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/vapid-public-key')
    if (!res.ok) return null
    const data = await res.json()
    return data.publicKey || null
  } catch {
    return null
  }
}

export async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  try {
    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      return existing
    }

    const vapidKey = await fetchVapidPublicKey()
    if (!vapidKey) {
      console.warn('[push] VAPID ključ nije dostupan.')
      return null
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
    })

    console.log('[push] Korisnik pretplacen:', subscription.endpoint)
    return subscription
  } catch (err) {
    console.error('[push] Greška pri pretplati:', err)
    return null
  }
}

export async function sendSubscriptionToServer(subscription: PushSubscription, authToken: string, salonId?: string) {
  try {
    const sub = subscription.toJSON()
    const body: Record<string, unknown> = {
      endpoint: sub.endpoint,
      auth_key: sub.keys?.auth || '',
      p256dh_key: sub.keys?.p256dh || '',
    }
    if (salonId) body.salon_id = salonId

    const res = await fetch('/api/notifications/register-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      console.error('[push] Greška pri registraciji na serveru:', json.error || res.status)
    }
  } catch (err) {
    console.error('[push] Greška pri slanju pretplate:', err)
  }
}

export async function unsubscribeFromPush(registration: ServiceWorkerRegistration, authToken: string) {
  try {
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    const endpoint = subscription.endpoint

    await fetch('/api/notifications/unregister-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ endpoint }),
    })

    await subscription.unsubscribe()
    console.log('[push] Korisnik odjavljen')
  } catch (err) {
    console.error('[push] Greška pri odjavi:', err)
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from(rawData.split('').map(c => c.charCodeAt(0)))
}
