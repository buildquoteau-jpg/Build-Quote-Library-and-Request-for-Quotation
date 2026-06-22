import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const builderId: string | null = typeof body.builderId === 'string' ? body.builderId : null

    const insertData: Record<string, string> = {}
    if (builderId) insertData.builder_id = builderId

    const { data, error } = await supabaseService
      .from('rfq_drafts')
      .insert(insertData)
      .select('id')
      .single()

    if (error) {
      console.error('[create-draft] Supabase error:', error)
      return NextResponse.json({ error: 'Could not create draft session.' }, { status: 500 })
    }

    return NextResponse.json({ draftId: data.id })
  } catch {
    return NextResponse.json({ error: 'Could not create draft session.' }, { status: 500 })
  }
}
