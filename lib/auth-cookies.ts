import { NextResponse } from 'next/server'

const ACCESS_TOKEN_COOKIE = 'sb-access-token'
const REFRESH_TOKEN_COOKIE = 'sb-refresh-token'
const IS_PROD = process.env.NODE_ENV === 'production'

export function setAuthCookies(
  response: NextResponse,
  session: { access_token: string; refresh_token: string; expires_in?: number },
) {
  const maxAge = session.expires_in || 3600

  response.cookies.set(ACCESS_TOKEN_COOKIE, session.access_token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge,
  })

  response.cookies.set(REFRESH_TOKEN_COOKIE, session.refresh_token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', { httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 0 })
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', { httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 0 })
}

export function getAuthCookiesFromRequest(request: Request): { accessToken: string | null; refreshToken: string | null } {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k, v.join('=')]
    }),
  )
  return {
    accessToken: cookies[ACCESS_TOKEN_COOKIE] || null,
    refreshToken: cookies[REFRESH_TOKEN_COOKIE] || null,
  }
}

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE }
