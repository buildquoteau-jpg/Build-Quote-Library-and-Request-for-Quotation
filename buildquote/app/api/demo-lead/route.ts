import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Generic pre-launch lead capture — emails the collected fields to BuildQuote.
// Used by the demo notice boxes (manufacturer interest, builder survey, etc.).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const type: unknown = body?.type
    const fields: unknown = body?.fields

    if (typeof type !== 'string' || !type.trim()) {
      return NextResponse.json({ success: false, error: 'Missing type.' }, { status: 400 })
    }
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      return NextResponse.json({ success: false, error: 'Missing fields.' }, { status: 400 })
    }

    const entries = Object.entries(fields as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
      .map(([k, v]) => [String(k).slice(0, 60), String(v).slice(0, 500)] as const)

    if (entries.length === 0) {
      return NextResponse.json({ success: false, error: 'Nothing to submit.' }, { status: 400 })
    }

    const safeType = escapeHtml(type.slice(0, 120))
    const rows = entries
      .map(([k, v]) => `
        <tr>
          <td style="padding:10px 0;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;text-transform:capitalize;">${escapeHtml(k)}</td>
          <td style="padding:10px 0;color:#000;font-weight:600;font-size:14px;border-bottom:1px solid #e2e8f0;">${escapeHtml(v)}</td>
        </tr>`)
      .join('')

    const { error } = await resend.emails.send({
      from: `BuildQuote <${process.env.RESEND_FROM_EMAIL || 'rfq@buildquote.com.au'}>`,
      to: ['meliagrace@gmail.com'],
      subject: `BuildQuote demo lead — ${safeType}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="color:#185D7A;margin:0 0 8px;">${safeType}</h2>
          <p style="color:#334155;margin:0 0 24px;">A new submission came through the BuildQuote demo platform.</p>
          <table style="width:100%;border-collapse:collapse;">${rows}</table>
        </div>
      `,
    })

    if (error) {
      console.error('[demo-lead] Resend error:', error)
      return NextResponse.json({ success: false, error: 'Could not send. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[demo-lead] Route error:', e)
    return NextResponse.json({ success: false, error: 'An error occurred. Please try again.' }, { status: 500 })
  }
}
