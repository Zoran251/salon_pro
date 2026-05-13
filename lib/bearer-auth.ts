/**
 * JWT samo iz zaglavlja Authorization: Bearer <token> (ne u query stringu — logovi, istorija, referrer).
 */
export function getBearerTokenFromRequest(request: Request): string | null {
  const h = request.headers.get('authorization')
  if (!h) return null
  const m = h.match(/^\s*Bearer\s+(.+)$/i)
  const t = m?.[1]?.trim()
  return t || null
}
