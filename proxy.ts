import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function buildCspHeader(nonce: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'self' https://www.google.com https://maps.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]
  return directives.join('; ')
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const cspHeader = buildCspHeader(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', cspHeader)
  } else {
    response.headers.set('Content-Security-Policy-Report-Only', cspHeader)
  }

  return response
}

export const config = {
  matcher: [
    { source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)' },
  ],
}
