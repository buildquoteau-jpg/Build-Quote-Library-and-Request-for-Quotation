import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const challenge = cookieStore.get('passkey_challenge')?.value
  const userId = cookieStore.get('passkey_user_id')?.value

  if (!challenge || !userId) {
    return NextResponse.json({ error: 'Challenge expired. Please try again.' }, { status: 400 })
  }

  const { credential } = await request.json()

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: passkey } = await adminSupabase
    .from('builder_passkeys')
    .select('*')
    .eq('credential_id', credential.id)
    .eq('builder_id', userId)
    .single()

  if (!passkey) {
    return NextResponse.json({ error: 'Passkey not found' }, { status: 404 })
  }

  const rpID = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : 'localhost'

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credential_id,
        publicKey: Buffer.from(passkey.public_key, 'base64'),
        counter: passkey.counter,
        transports: passkey.transports || [],
      },
    })

    if (!verification.verified) {
      return NextResponse.json({ error: 'Passkey verification failed' }, { status: 401 })
    }

    // Update counter
    await adminSupabase
      .from('builder_passkeys')
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq('id', passkey.id)

    // Get user email to generate a magic link for session exchange
    const { data: userData } = await adminSupabase.auth.admin.getUserById(userId)
    if (!userData?.user?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
    })

    if (linkError || !linkData?.properties) {
      return NextResponse.json({ error: 'Could not create session' }, { status: 500 })
    }

    cookieStore.delete('passkey_challenge')
    cookieStore.delete('passkey_user_id')

    // Return the hashed token — client uses verifyOtp to exchange for a session
    return NextResponse.json({
      token_hash: linkData.properties.hashed_token,
      email: userData.user.email,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Verification error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
