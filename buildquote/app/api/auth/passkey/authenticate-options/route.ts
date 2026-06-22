import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  // Use service role to look up passkeys by email (user not yet authenticated)
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find user by email
  const { data: users } = await adminSupabase.auth.admin.listUsers()
  const targetUser = users?.users?.find(u => u.email === email)

  if (!targetUser) {
    // Generic response — avoids confirming whether an email is registered
    return NextResponse.json({ error: 'No passkey found for this account.' }, { status: 404 })
  }

  const { data: passkeys } = await adminSupabase
    .from('builder_passkeys')
    .select('credential_id, transports')
    .eq('builder_id', targetUser.id)

  if (!passkeys?.length) {
    return NextResponse.json({ error: 'No passkey found for this account.' }, { status: 404 })
  }

  const rpID = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : 'localhost'

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: passkeys.map(p => ({
      id: p.credential_id,
      transports: p.transports || [],
    })),
    userVerification: 'preferred',
  })

  const cookieStore = await cookies()
  cookieStore.set('passkey_challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 300,
    path: '/',
  })
  cookieStore.set('passkey_user_id', targetUser.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 300,
    path: '/',
  })

  return NextResponse.json(options)
}
