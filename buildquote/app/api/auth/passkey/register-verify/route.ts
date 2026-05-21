import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cookieStore = await cookies()
  const challenge = cookieStore.get('passkey_challenge')?.value
  if (!challenge) return NextResponse.json({ error: 'Challenge expired. Please try again.' }, { status: 400 })

  const { credential } = await request.json()

  const rpID = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : 'localhost'

  const origin = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
    }

    const { credential: cred } = verification.registrationInfo

    await supabase.from('builder_passkeys').insert({
      builder_id: user.id,
      credential_id: cred.id,
      public_key: Buffer.from(cred.publicKey).toString('base64'),
      counter: cred.counter,
      device_type: verification.registrationInfo.credentialDeviceType,
      backed_up: verification.registrationInfo.credentialBackedUp,
      transports: credential.response?.transports || [],
    })

    cookieStore.delete('passkey_challenge')

    return NextResponse.json({ verified: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Verification error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
