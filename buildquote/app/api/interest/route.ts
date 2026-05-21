import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { email, role } = await req.json()

    if (!email || !role) {
      return NextResponse.json({ success: false, error: 'Email and role are required.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email address.' }, { status: 400 })
    }

    const { error } = await resend.emails.send({
      from: `BuildQuote <${process.env.RESEND_FROM_EMAIL || 'rfq@buildquote.com.au'}>`,
      to: ['meliagrace@gmail.com'],
      subject: `New interest registration — ${role}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="color:#185D7A;margin:0 0 8px;">New interest registration</h2>
          <p style="color:#334155;margin:0 0 24px;">Someone just registered interest on the BuildQuote coming soon page.</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:10px 0;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">Role</td>
              <td style="padding:10px 0;color:#000;font-weight:600;font-size:14px;border-bottom:1px solid #e2e8f0;">${role}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;font-size:14px;">Email</td>
              <td style="padding:10px 0;color:#000;font-weight:600;font-size:14px;">${email}</td>
            </tr>
          </table>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Interest route error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
