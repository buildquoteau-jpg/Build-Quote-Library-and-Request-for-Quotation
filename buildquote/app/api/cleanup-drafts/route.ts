import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Vercel cron calls this once a day.
// Deletes rfq_drafts that are:
//   - status = 'draft'
//   - older than 24 hours
//   - have zero items in rfq_draft_items

export async function GET(req: NextRequest) {
  // Vercel sets CRON_SECRET automatically — verify it so only Vercel can trigger this.
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role key to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Find all draft-status rows older than 24 h
  const { data: oldDrafts, error: fetchError } = await supabase
    .from('rfq_drafts')
    .select('id')
    .eq('status', 'draft')
    .lt('created_at', cutoff)

  if (fetchError) {
    console.error('[cleanup-drafts] fetch error:', fetchError.message)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!oldDrafts?.length) {
    return NextResponse.json({ deleted: 0, message: 'Nothing to clean up.' })
  }

  const draftIds = oldDrafts.map(d => d.id)

  // Exclude any that actually have items (don't delete drafts in progress)
  const { data: itemRows } = await supabase
    .from('rfq_draft_items')
    .select('draft_id')
    .in('draft_id', draftIds)

  const withItems = new Set((itemRows ?? []).map((r: { draft_id: string }) => r.draft_id))
  const emptyIds  = draftIds.filter(id => !withItems.has(id))

  if (emptyIds.length === 0) {
    return NextResponse.json({ deleted: 0, message: 'All old drafts have items — nothing deleted.' })
  }

  // Delete (items first in case there's no cascade FK)
  await supabase.from('rfq_draft_items').delete().in('draft_id', emptyIds)

  const { error: deleteError } = await supabase
    .from('rfq_drafts')
    .delete()
    .in('id', emptyIds)

  if (deleteError) {
    console.error('[cleanup-drafts] delete error:', deleteError.message)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  console.log(`[cleanup-drafts] deleted ${emptyIds.length} empty drafts`)
  return NextResponse.json({ deleted: emptyIds.length })
}
