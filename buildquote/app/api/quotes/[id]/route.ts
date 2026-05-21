import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const VALID_STATUSES = ['sent', 'won', 'declined'] as const
type QuoteStatus = typeof VALID_STATUSES[number]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Verify session
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const status: QuoteStatus = body.status
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Use service role to bypass RLS — we've already verified the user above.
  // This also handles old records where builder_id was null (match by email instead).
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Confirm this RFQ belongs to this builder before updating
  const { data: rfq } = await admin
    .from('rfq_requests')
    .select('builder_id, builder_email')
    .eq('id', id)
    .single()

  if (!rfq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ownsRecord =
    (rfq.builder_id && rfq.builder_id === user.id) ||
    (!rfq.builder_id && rfq.builder_email === user.email)

  if (!ownsRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await admin
    .from('rfq_requests')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error('Quote status update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
