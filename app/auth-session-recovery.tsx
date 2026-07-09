'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { isInvalidRefreshTokenError } from '@/lib/auth-refresh-errors'
import { waitForClientSession } from '@/lib/wait-client-session'

async function registrujPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
  try {
    const { registerServiceWorker, subscribeToPush, sendSubscriptionToServer } = await import('@/lib/web-push/client')
    const reg = await registerServiceWorker()
    if (reg) {
      const existing = await reg.pushManager.getSubscription()
      if (!existing) return // ne traži dozvolu – čekamo da korisnik sam klikne
      const sub = await subscribeToPush(reg)
      if (sub) {
        const session = await waitForClientSession()
        if (session?.access_token) {
          await sendSubscriptionToServer(sub, session.access_token)
        }
      }
    }
  } catch (e) {
    console.error('[push] Greška pri registraciji:', e)
  }
}

export function AuthSessionRecovery() {
  const registrovan = useRef(false)

  useEffect(() => {
    const clearLocalAuth = () => void supabase.auth.signOut({ scope: 'local' })

    const pokreniRegistraciju = () => {
      if (registrovan.current) return
      registrovan.current = true
      void registrujPush()
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error && isInvalidRefreshTokenError(error.message)) clearLocalAuth()
      if (data.session?.user) pokreniRegistraciju()
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        registrovan.current = false
        return
      }
      if ((event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && !session) {
        clearLocalAuth()
      }
      if (session?.user) pokreniRegistraciju()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return null
}
