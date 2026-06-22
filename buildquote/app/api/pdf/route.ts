import { NextRequest, NextResponse } from 'next/server'
import { RFQPayload } from '@/lib/types'
import { generatePDFBuffer } from '@/lib/generatePDF'

export async function POST(req: NextRequest) {
  try {
    const payload: RFQPayload = await req.json()
    const buffer = await generatePDFBuffer(payload)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${payload.rfqId}.pdf"`,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}