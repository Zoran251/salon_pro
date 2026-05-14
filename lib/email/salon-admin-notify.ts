/**
 * Obaveštenja salona (centralni inbox) preko Resend HTTP API-ja.
 * Bez RESEND_API_KEY ili SALON_ADMIN_EMAIL slanje se preskače — ne ruši API rute.
 */

export type SalonAdminEmailResult = { ok: boolean; skipped?: boolean; error?: string }

export async function sendSalonAdminEmail(params: {
  subject: string
  text: string
}): Promise<SalonAdminEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const to = process.env.SALON_ADMIN_EMAIL?.trim()
  const from =
    process.env.EMAIL_FROM?.trim() ||
    'SalonPro obaveštenja <onboarding@resend.dev>'

  if (!apiKey || !to) {
    console.warn('[email] sendSalonAdminEmail: preskočeno (nedostaje RESEND_API_KEY ili SALON_ADMIN_EMAIL)')
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
    console.error('[email] sendSalonAdminEmail:', msg)
    return { ok: false, error: msg }
  }
}
