import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Allowed profile fields — explicit whitelist prevents mass-assignment
const ALLOWED_PROFILE_FIELDS = [
  'builder_name',
  'company_name',
  'abn',
  'company_address',
  'company_address_place_id',
  'office_phone',
  'mobile_phone',
] as const

type AllowedField = typeof ALLOWED_PROFILE_FIELDS[number]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GENERIC_ERROR = 'Registration failed. Please check your details and try again.'

// In-memory rate limit: 5 registration attempts per IP per hour
const REGISTER_LIMIT = 5
const REGISTER_WINDOW_MS = 60 * 60 * 1000
const registerRateMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = registerRateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    registerRateMap.set(ip, { count: 1, resetAt: now + REGISTER_WINDOW_MS })
    return true
  }
  if (entry.count >= REGISTER_LIMIT) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 })
  }

  const { email, password, profile } = body

  // Validate email and password server-side
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  // Whitelist profile fields — drop anything not in the allowed list
  const safeProfile: Partial<Record<AllowedField, string>> = {}
  if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
    for (const field of ALLOWED_PROFILE_FIELDS) {
      const val = (profile as Record<string, unknown>)[field]
      if (typeof val === 'string') safeProfile[field] = val
    }
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    // Log the real error server-side; return generic message to avoid email enumeration
    console.error('[register] Auth error:', authError?.message)
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 })
  }

  const { error: profileError } = await adminSupabase.from('builders').insert({
    id: authData.user.id,
    email: email.trim(),
    ...safeProfile,
  })

  if (profileError) {
    console.error('[register] Profile error:', profileError.message)
    await adminSupabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 })
  }

  return NextResponse.json({ userId: authData.user.id })
}
