import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

// In-memory brute-force guard: 10 attempts per IP per 15 min
const ATTEMPT_LIMIT = 10
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const attemptMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attemptMap.get(ip)
  if (!entry || now > entry.resetAt) {
    attemptMap.set(ip, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS })
    return true
  }
  if (entry.count >= ATTEMPT_LIMIT) return false
  entry.count++
  return true
}

function hmacCookieValue(password: string): string {
  // HMAC-SHA256 of the password using itself as key.
  // The cookie never carries the raw password — an attacker who reads the
  // cookie cannot recover it (HMAC is one-way without the key).
  const secret = process.env.DEMO_COOKIE_SECRET || password
  return createHmac('sha256', secret).update(password).digest('hex')
}

export function verifyAccessCookie(cookieValue: string | undefined, demoPassword: string): boolean {
  if (!cookieValue) return false
  const expected = hmacCookieValue(demoPassword)
  try {
    return timingSafeEqual(Buffer.from(cookieValue), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const ip = (req.headers as Headers).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const demoPassword = process.env.DEMO_PASSWORD
  if (!demoPassword) {
    return NextResponse.json({ error: 'Access not configured.' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await (req as Request & { json(): Promise<Record<string, unknown>> }).json()
  } catch {
    return NextResponse.json({ error: 'Incorrect access code.' }, { status: 401 })
  }

  const { password } = body
  if (typeof password !== 'string') {
    return NextResponse.json({ error: 'Incorrect access code.' }, { status: 401 })
  }

  // Constant-time comparison to prevent timing attacks
  let match = false
  try {
    match = timingSafeEqual(Buffer.from(password), Buffer.from(demoPassword))
  } catch {
    // Buffers of different length — definitely wrong
    match = false
  }

  if (!match) {
    return NextResponse.json({ error: 'Incorrect access code.' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('bq_access', hmacCookieValue(demoPassword), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
