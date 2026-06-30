import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const builderId: string | null = typeof body.builderId === 'string' ? body.builderId : null
    const supplierName: string | null = typeof body.supplierName === 'string' ? body.supplierName : null
    const supplierEmail: string | null = typeof body.supplierEmail === 'string' ? body.supplierEmail : null
    const supplierId: string | null = typeof body.supplierId === 'string' ? body.supplierId : null

    // Base snapshot — columns present on rfq_drafts before the 20260630 migration.
    const insertData: Record<string, string> = {}
    if (builderId) insertData.builder_id = builderId
    if (supplierName) insertData.supplier_name = supplierName
    if (supplierEmail) insertData.supplier_email = supplierEmail

    const { data, error } = await supabaseService
      .from('rfq_drafts')
      .insert(insertData)
      .select('id')
      .single()

    if (error) {
      console.error('[create-draft] Supabase error:', error)
      return NextResponse.json({ error: 'Could not create draft session.' }, { status: 500 })
    }

    // supplier_id was added by the 20260630 migration — update it separately and
    // swallow failures so a missing column never breaks draft creation.
    if (supplierId) {
      const { error: linkError } = await supabaseService
        .from('rfq_drafts')
        .update({ supplier_id: supplierId })
        .eq('id', data.id)
      if (linkError) console.error('[create-draft] supplier_id link skipped:', linkError)
    }

    return NextResponse.json({ draftId: data.id })
  } catch {
    return NextResponse.json({ error: 'Could not create draft session.' }, { status: 500 })
  }
}
