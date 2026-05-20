import { NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('builders').select('builder_name, company_name').eq('id', user.id).single()
  const { data: existingPasskeys } = await supabase.from('builder_passkeys').select('credential_id').eq('builder_id', user.id)

  const rpID = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : 'localhost'

  const options = await generateRegistrationOptions({
    rpName: 'BuildQuote',
    rpID,
    userName: user.email!,
    userDisplayName: profile?.builder_name || profile?.company_name || user.email!,
    excludeCredentials: (existingPasskeys || []).map(p => ({ id: p.credential_id })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })

  const cookieStore = await cookies()
  cookieStore.set('passkey_challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 300,
    path: '/',
  })

  return NextResponse.json(options)
}
