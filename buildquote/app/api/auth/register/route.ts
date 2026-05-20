import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const { email, password, profile } = await request.json()

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create the auth user
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email confirmation — builder app
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Sign up failed' }, { status: 400 })
  }

  // Insert builder profile using service role (bypasses RLS)
  const { error: profileError } = await adminSupabase.from('builders').insert({
    id: authData.user.id,
    email,
    ...profile,
  })

  if (profileError) {
    // Roll back the auth user so it's not orphaned
    await adminSupabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Profile save failed: ' + profileError.message }, { status: 500 })
  }

  return NextResponse.json({ userId: authData.user.id })
}
