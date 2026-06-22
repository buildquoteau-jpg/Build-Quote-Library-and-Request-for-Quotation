import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { generatePDFBuffer } from '@/lib/generatePDF'
import { RFQPayload } from '@/lib/types'

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

  const [{ data: rfq }, { data: rfqItems }] = await Promise.all([
    admin.from('rfq_requests')
      .select('*')
      .eq('id', id)
      .single(),
    admin.from('rfq_items')
      .select('*')
      .eq('rfq_id', id)
      .order('sort_order', { ascending: true }),
  ])

  if (!rfq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ownsRecord =
    (rfq.builder_id && rfq.builder_id === user.id) ||
    (!rfq.builder_id && rfq.builder_email === user.email)

  if (!ownsRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payload: RFQPayload = {
    rfqId: rfq.rfq_id_short || id.slice(0, 8).toUpperCase(),
    builder: {
      builderName: rfq.builder_name || '',
      company: rfq.project_name || '',
      abn: '',
      phone: '',
      email: rfq.builder_email || '',
    },
    supplier: {
      supplierName: rfq.supplier_name || '',
      supplierEmail: rfq.supplier_email || '',
      accountNumber: '',
    },
    items: (rfqItems || []).map((item: any) => ({
      id: item.id,
      name: item.item_name || '',
      sku: item.notes || '',
      productId: '',
      desc: item.specification || '',
      uom: item.unit || '',
      qty: item.quantity != null ? String(item.quantity) : '',
      confidence: 'high' as const,
      length_mm: null, width_mm: null, height_mm: null, thickness_mm: null,
      depth_mm: null, gauge_mm: null, diameter_mm: null, roll_m: null,
      weight_kg: null, pieces: null, coverage_m2: null,
    })),
    delivery: 'delivery',
    siteAddress: rfq.delivery_location || '',
    siteSuburb: '',
    dateRequired: '',
    message: rfq.notes || '',
    projectReference: rfq.project_reference || '',
    sendToSupplier: rfq.send_to_supplier !== false,
    sendCopyToSelf: false,
    pmName: '',
    pmPhone: '',
    siteAccessNotes: '',
    preferredContact: 'either',
  }

  try {
    const buffer = await generatePDFBuffer(payload)
    const filename = `${payload.rfqId}.pdf`
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    console.error('PDF generation error:', e)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
