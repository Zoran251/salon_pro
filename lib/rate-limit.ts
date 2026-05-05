const hits = new Map<string, { count: number; resetAt: number }>()

const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key)
  }
}

export function rateLimit(
  key: string,
  { maxRequests = 10, windowMs = 60_000 } = {},
): { ok: boolean; remaining: number } {
  cleanup()
  const now = Date.now()
  const entry = hits.get(key)

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: maxRequests - 1 }
  }

  entry.count += 1
  if (entry.count > maxRequests) {
    return { ok: false, remaining: 0 }
  }
  return { ok: true, remaining: maxRequests - entry.count }
}

export function rateLimitByIp(
  request: Request,
  endpoint: string,
  opts?: { maxRequests?: number; windowMs?: number },
): { ok: boolean; remaining: number } {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  return rateLimit(`${endpoint}:${ip}`, opts)
}
