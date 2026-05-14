/**
 * Resend HTTP API — transakcioni mejl (salon admin ili korisnik).
 * Bez RESEND_API_KEY slanje se preskače — ne ruši API rute.
 */

export type SalonAdminEmailResult = { ok: boolean; skipped?: boolean; error?: string }

function getResendFrom(): string {
  return process.env.EMAIL_FROM?.trim() || 'SalonPro obaveštenja <onboarding@resend.dev>'
}

function isPlausibleEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

/** Bilo koji primaoc (npr. korisnik); zahteva RESEND_API_KEY. */
export async function sendTransactionalEmail(params: {
  to: string
  subject: string
  text: string
}): Promise<SalonAdminEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const to = params.to.trim()
  const from = getResendFrom()

  if (!apiKey || !to || !isPlausibleEmail(to)) {
    console.warn('[email] sendTransactionalEmail: preskočeno (RESEND_API_KEY ili nevažeća adresa primaoca)')
    return { ok: false, skipped: true }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: params.subject,
        text: params.text,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[email] Resend odgovor:', res.status, errText)
      return { ok: false, error: errText || `HTTP ${res.status}` }
    }

    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Nepoznata greška'
    console.error('[email] sendTransactionalEmail:', msg)
    return { ok: false, error: msg }
  }
}

/** Centralni inbox salona / platforme — RESEND + SALON_ADMIN_EMAIL. */
export async function sendSalonAdminEmail(params: {
  subject: string
  text: string
}): Promise<SalonAdminEmailResult> {
  const admin = process.env.SALON_ADMIN_EMAIL?.trim()
  if (!admin || !isPlausibleEmail(admin)) {
    console.warn('[email] sendSalonAdminEmail: preskočeno (nedostaje SALON_ADMIN_EMAIL)')
    return { ok: false, skipped: true }
  }
  return sendTransactionalEmail({ to: admin, subject: params.subject, text: params.text })
}
