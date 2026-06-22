import { NextRequest, NextResponse } from 'next/server'
import { RFQPayload } from '@/lib/types'
import { generateCSVString } from '@/lib/generateCSV'

export async function POST(req: NextRequest) {
  try {
    const payload: RFQPayload = await req.json()
    const csv = generateCSVString(payload)

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${payload.rfqId}.csv"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
