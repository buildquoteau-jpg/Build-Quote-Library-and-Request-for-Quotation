import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// Server-side email link handler for the token_hash flow (password recovery,
// email confirmation, magic links). Unlike the PKCE `?code=` flow, verifyOtp
// with a token_hash needs no client-stored code verifier, so the link works
// even when opened on a different device than the one that requested it.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  // Where to send the user after the token is verified. For password recovery
  // this is the "set a new password" page; the verified session lets it load.
  const next = searchParams.get('next') || '/reset-password/update'

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      // Session cookies are attached to this redirect response.
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Missing/invalid/expired token — land on the update page, which shows the
  // "invalid or expired link" state with a link to request a fresh one.
  return NextResponse.redirect(new URL('/reset-password/update', origin))
}
