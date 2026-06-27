'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { isInvalidRefreshTokenError } from '@/lib/auth-refresh-errors'

async function registrujPush(sessionUserId: string) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
  try {
    const { registerServiceWorker, subscribeToPush, sendSubscriptionToServer } = await import('@/lib/web-push/client')
    const reg = await registerServiceWorker()
    if (reg) {
      const sub = await subscribeToPush(reg)
      if (sub) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          await sendSubscriptionToServer(sub, session.access_token, sessionUserId)
        }
      }
    }
  } catch (e) {
    console.error('[push] Greška pri registraciji:', e)
  }
}

/**
 * Čisti oštećenu / isteklu sesiju u localStorage (npr. „Invalid Refresh Token: Refresh Token Not Found”).
 * Nije greška PostgreSQL veza — Auth token u pregledniku ne odgovara projektu na Supabase-u.
 * Takođe registruje Web Push pretplatu za prijavljene korisnike.
 */
export function AuthSessionRecovery() {
  const registrovan = useRef(false)

  useEffect(() => {
    const clearLocalAuth = () => void supabase.auth.signOut({ scope: 'local' })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error && isInvalidRefreshTokenError(error.message)) clearLocalAuth()
      if (data.session?.user && !registrovan.current) {
        registrovan.current = true
        void registrujPush(data.session.user.id)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') return
      if ((event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && !session) {
        clearLocalAuth()
      }
      if (session?.user && !registrovan.current) {
        registrovan.current = true
        void registrujPush(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
