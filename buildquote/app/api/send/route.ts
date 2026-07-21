import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { RFQPayload } from '@/lib/types'
import { buildEmailHtml } from '@/lib/emailTemplate'
import { generatePDFBuffer } from '@/lib/generatePDF'
import { generateCSVString } from '@/lib/generateCSV'
import { supabaseService as supabase } from '@/lib/supabase-service'

const resend = new Resend(process.env.RESEND_API_KEY)
const TEST_MODE = process.env.TEST_MODE === "true"

// In-memory rate limit: max 3 sends per IP per hour.
// Caveat: resets on cold-start in serverless — adds meaningful friction, not a hard guarantee.
const EMAIL_LIMIT = 3
const EMAIL_WINDOW_MS = 60 * 60 * 1000
const sendRateMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = sendRateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    sendRateMap.set(ip, { count: 1, resetAt: now + EMAIL_WINDOW_MS })
    return true
  }
  if (entry.count >= EMAIL_LIMIT) return false
  entry.count++
  return true
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ITEMS = 200

function validEmail(s: unknown): s is string {
  return typeof s === 'string' && EMAIL_RE.test(s.trim())
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const payload: RFQPayload = await req.json()

    // Validate required fields
    if (
      typeof payload.builder?.builderName !== 'string' || !payload.builder.builderName.trim() ||
      typeof payload.builder?.company !== 'string' || !payload.builder.company.trim() ||
      !validEmail(payload.builder?.email)
    ) {
      return NextResponse.json(
        { success: false, error: 'Builder details are incomplete.' },
        { status: 400 }
      )
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items in this RFQ.' },
        { status: 400 }
      )
    }

    if (payload.items.length > MAX_ITEMS) {
      return NextResponse.json(
        { success: false, error: 'Too many items in this RFQ.' },
        { status: 400 }
      )
    }

    const builderEmail = payload.builder.email.trim()

    if (payload.sendToSupplier === true) {
      if (!validEmail(payload.supplier?.supplierEmail)) {
        return NextResponse.json(
          { success: false, error: 'Supplier email is missing or invalid.' },
          { status: 400 }
        )
      }

      const supplierEmail = payload.supplier.supplierEmail.trim()
      const recipient = TEST_MODE ? builderEmail : supplierEmail
      const cc = TEST_MODE ? [] : (payload.sendCopyToSelf && builderEmail ? [builderEmail] : [])

      const html = buildEmailHtml(payload)
      const pdfBuffer = await generatePDFBuffer(payload)
      const csvString = generateCSVString(payload)

      console.log('[SEND] sendToSupplier: true, recipient:', recipient)

      const { data, error } = await resend.emails.send({
        from: `BuildQuote <${process.env.RESEND_FROM_EMAIL || 'rfq@buildquote.com.au'}>`,
        to: [recipient],
        bcc: ['rfq@buildquote.com.au'],
        cc,
        replyTo: builderEmail,
        subject: [
          `RFQ from ${payload.builder.builderName}`,
          payload.builder.company && payload.builder.company !== payload.builder.builderName ? payload.builder.company : null,
          payload.rfqId,
        ].filter(Boolean).join(' — '),
        html,
        attachments: [
          { filename: `${payload.rfqId}.pdf`, content: pdfBuffer },
          { filename: `${payload.rfqId}.csv`, content: Buffer.from(csvString) },
        ],
      })

      if (error) {
        console.error('[SEND] Resend error:', error)
        return NextResponse.json({ success: false, error: 'Failed to send email.' }, { status: 500 })
      }

      console.log('[SEND] Email sent:', data?.id)
    } else {
      // No email send — still generate for Supabase logging below
      console.log('[SEND] sendToSupplier: false — skipping email')
    }

    // Log to Supabase (non-fatal if this fails — email already sent)
    const { data: rfqRow, error: rfqError } = await supabase
      .from('rfq_requests')
      .insert({
        builder_id: payload.builderId || null,
        builder_name: payload.builder.builderName,
        builder_email: builderEmail,
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
        supplier_name: payload.supplier?.supplierName || null,
        supplier_email: payload.supplier?.supplierEmail || null,
        rfq_id_short: payload.rfqId || null,
        draft_id: payload.draftId || null,
        builder_abn: payload.builder.abn || null,
        builder_phone: payload.builder.phone || null,
        pm_name: payload.pmName || null,
        pm_phone: payload.pmPhone || null,
        site_suburb: payload.siteSuburb || null,
        date_required: payload.dateRequired || null,
        site_access_notes: payload.siteAccessNotes || null,
        preferred_contact: payload.preferredContact || null,
        supplier_account_number: payload.supplier?.accountNumber || null,
      })
      .select('id')
      .single()

    if (rfqError) {
      console.error('[SEND] Supabase rfq_requests error:', rfqError)
    } else {
      const itemRows = payload.items.slice(0, MAX_ITEMS).map((item, i) => ({
        rfq_id: rfqRow.id,
        item_name: item.name,
        quantity: item.qty ? parseFloat(item.qty) : null,
        unit: item.uom || null,
        specification: item.desc || null,
        notes: item.sku || null,
        source: 'ai_parsed',
        sort_order: i,
      }))

      const { error: itemsError } = await supabase.from('rfq_items').insert(itemRows)
      if (itemsError) {
        console.error('[SEND] Supabase rfq_items error:', itemsError)
      } else {
        console.log('[SEND] RFQ saved to Supabase:', rfqRow.id)
      }

      if (payload.draftId) {
        const { error: archiveErr } = await supabase
          .from('rfq_drafts')
          .update({ status: 'sent' })
          .eq('id', payload.draftId)
        if (archiveErr) console.error('[SEND] Draft archive error:', archiveErr)
      }
    }

    return NextResponse.json({ success: true, rfqId: payload.rfqId })

  } catch (e) {
    console.error('[SEND] Route error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ success: false, error: 'An error occurred. Please try again.' }, { status: 500 })
  }
}
