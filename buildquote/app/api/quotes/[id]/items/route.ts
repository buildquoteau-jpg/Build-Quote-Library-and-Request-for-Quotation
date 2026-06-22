import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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

  const { data: items } = await admin
    .from('rfq_items')
    .select('id, item_name, quantity, unit, specification, notes, sort_order')
    .eq('rfq_id', id)
    .order('sort_order', { ascending: true })

  return NextResponse.json({ items: items || [] })
}
