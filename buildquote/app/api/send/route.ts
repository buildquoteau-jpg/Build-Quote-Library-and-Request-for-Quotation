import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { RFQPayload } from '@/lib/types'
import { buildEmailHtml } from '@/lib/emailTemplate'
import { generatePDFBuffer } from '@/lib/generatePDF'
import { generateCSVString } from '@/lib/generateCSV'
import { supabase } from '@/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

const TEST_MODE = process.env.TEST_MODE === "true"

export async function POST(req: NextRequest) {
  try {
    const payload: RFQPayload = await req.json()

    const html = buildEmailHtml(payload)
    const pdfBuffer = await generatePDFBuffer(payload)
    const csvString = generateCSVString(payload)

    // Only email if sendToSupplier is true
    console.log('[SEND] sendToSupplier:', JSON.stringify(payload.sendToSupplier))
    if (payload.sendToSupplier === true) {
      // Test Supplier — send only to builder's own email, no supplier email
      const isTestSupplier = payload.supplier.supplierName === 'Test Supplier' || payload.supplier.supplierName.startsWith('Sandbox')

      const builderEmail = (payload.builder.email || '').trim()
      const supplierEmail = (payload.supplier.supplierEmail || '').trim()
      const recipient = (TEST_MODE || isTestSupplier) ? builderEmail : supplierEmail
      const cc = (TEST_MODE || isTestSupplier) ? [] : (payload.sendCopyToSelf && builderEmail ? [builderEmail] : [])

      if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        return NextResponse.json(
          { success: false, error: 'Recipient email is missing or invalid.' },
          { status: 400 }
        )
      }

      const { data, error } = await resend.emails.send({
        from: `BuildQuote <${process.env.RESEND_FROM_EMAIL || 'rfq@buildquote.com.au'}>`,
        to: [recipient],
        bcc: ['rfq@buildquote.com.au'],
        cc,
        replyTo: builderEmail || undefined,
        subject: `RFQ from ${payload.builder.builderName} — ${payload.builder.company} — ${payload.rfqId}`,
        html,
        attachments: [
          { filename: `${payload.rfqId}.pdf`, content: pdfBuffer },
          { filename: `${payload.rfqId}.csv`, content: Buffer.from(csvString) },
        ],
      })

      if (error) {
        console.error('Resend error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      console.log('Email sent:', data?.id)
    }

    // Save to Supabase
    const { data: rfqRow, error: rfqError } = await supabase
      .from('rfq_requests')
      .insert({
        builder_id: payload.builderId || null,
        builder_name: payload.builder.builderName,
        builder_email: payload.builder.email,
        project_name: payload.builder.company,
        project_reference: payload.projectReference || null,
        delivery_location: payload.siteAddress
          ? `${payload.siteAddress}${payload.siteSuburb ? ', ' + payload.siteSuburb : ''}`
          : null,
        notes: payload.message || null,
        status: 'sent',
        send_to_supplier: payload.sendToSupplier !== false,
        terms_confirmed: true,
        terms_confirmed_at: new Date().toISOString(),
        supplier_name: payload.supplier.supplierName,
        supplier_email: payload.supplier.supplierEmail,
        rfq_id_short: payload.rfqId || null,
        draft_id: payload.draftId || null,
      })
      .select('id')
      .single()

    if (rfqError) {
      console.error('Supabase rfq_requests error:', rfqError)
      // Don't fail the whole request — email already sent
    } else {
      // Save line items
      const itemRows = payload.items.map((item, i) => ({
        rfq_id: rfqRow.id,
        item_name: item.name,
        quantity: item.qty ? parseFloat(item.qty) : null,
        unit: item.uom || null,
        specification: item.desc || null,
        notes: item.sku || null,
        source: 'ai_parsed',
        sort_order: i,
      }))

      const { error: itemsError } = await supabase
        .from('rfq_items')
        .insert(itemRows)

      if (itemsError) {
        console.error('Supabase rfq_items error:', itemsError)
      } else {
        console.log('RFQ saved to Supabase:', rfqRow.id)
      }

      // Archive the originating draft so it disappears from My Quotes > Drafts
      if (payload.draftId) {
        const { error: archiveErr } = await supabase
          .from('rfq_drafts')
          .update({ status: 'sent' })
          .eq('id', payload.draftId)
        if (archiveErr) console.error('Draft archive error:', archiveErr)
      }
    }

    return NextResponse.json({ success: true, rfqId: payload.rfqId })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Send route error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
