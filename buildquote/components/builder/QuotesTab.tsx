'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Draft {
  id: string
  supplier_name: string | null
  project_reference: string | null
  created_at: string
  item_count: number
}

interface SentRFQ {
  id: string
  rfq_id_short: string | null
  supplier_name: string | null
  supplier_email: string | null
  project_reference: string | null
  status: 'sent' | 'won' | 'declined'
  created_at: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'draft') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
      Draft — not yet sent
    </span>
  )
  if (status === 'sent') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
      Sent
    </span>
  )
  if (status === 'won') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
      Won — proceeding to order
    </span>
  )
  if (status === 'declined') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
      Declined
    </span>
  )
  return null
}

export default function QuotesTab({ builderId }: { builderId: string }) {
  const supabase = createSupabaseBrowserClient()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [sent, setSent] = useState<SentRFQ[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    // Fetch drafts first so their IDs are available for the item count query
    const { data: draftRows } = await supabase
      .from('rfq_drafts')
      .select('id, supplier_name, project_reference, created_at')
      .eq('builder_id', builderId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })

    const draftIds = (draftRows || []).map((d: { id: string }) => d.id)

    const [{ data: sentRows }, { data: itemCounts }] = await Promise.all([
      supabase
        .from('rfq_requests')
        .select('id, rfq_id_short, supplier_name, supplier_email, project_reference, status, created_at')
        .eq('builder_id', builderId)
        .order('created_at', { ascending: false }),
      draftIds.length > 0
        ? supabase.from('rfq_draft_items').select('draft_id').in('draft_id', draftIds)
        : Promise.resolve({ data: [] }),
    ])

    // Build draft item count map
    const countMap: Record<string, number> = {}
    for (const row of (itemCounts || []) as { draft_id: string }[]) {
      countMap[row.draft_id] = (countMap[row.draft_id] || 0) + 1
    }

    setDrafts(
      (draftRows || []).map((d: { id: string; supplier_name: string | null; project_reference: string | null; created_at: string }) => ({
        ...d,
        item_count: countMap[d.id] || 0,
      }))
    )
    setSent((sentRows || []) as SentRFQ[])
    setLoading(false)
  }, [builderId])

  useEffect(() => { load() }, [load])

  async function handleDiscard(draftId: string) {
    if (!confirm('Discard this draft? This cannot be undone.')) return
    await supabase.from('rfq_draft_items').delete().eq('draft_id', draftId)
    await supabase.from('rfq_drafts').delete().eq('id', draftId)
    setDrafts(d => d.filter(x => x.id !== draftId))
  }

  async function handleStatusUpdate(rfqId: string, status: 'won' | 'declined' | 'sent') {
    setUpdatingId(rfqId)
    try {
      const res = await fetch(`/api/quotes/${rfqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setSent(s => s.map(x => x.id === rfqId ? { ...x, status } : x))
      }
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-muted text-sm font-medium">Loading quotes…</p>
      </div>
    )
  }

  const hasDrafts = drafts.length > 0
  const hasSent = sent.length > 0

  if (!hasDrafts && !hasSent) {
    return (
      <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-12 text-center">
        <p className="text-text-muted font-semibold text-base">No quotes yet.</p>
        <p className="text-text-muted text-sm mt-1">Send your first RFQ and it will appear here.</p>
        <a
          href="/rfq"
          className="mt-5 inline-block bg-navy text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition"
        >
          + New RFQ
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">

      {/* ── Drafts ───────────────────────────────────────────────── */}
      {hasDrafts && (
        <section>
          <h3 className="text-base font-bold text-text-primary mb-4">
            Drafts
            <span className="ml-2 text-xs font-semibold text-text-muted bg-surface-subtle border border-border-subtle px-2 py-0.5 rounded-full">
              {drafts.length}
            </span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {drafts.map(draft => (
              <div
                key={draft.id}
                className="bg-surface border border-amber-200 rounded-2xl p-5 flex flex-col gap-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <StatusBadge status="draft" />
                  <span className="text-xs text-text-muted font-medium shrink-0">
                    {formatDate(draft.created_at)}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="font-bold text-navy text-sm">
                    {draft.supplier_name || 'Supplier not yet selected'}
                  </p>
                  {draft.project_reference && (
                    <p className="text-xs text-text-secondary font-medium">{draft.project_reference}</p>
                  )}
                  <p className="text-xs text-text-muted">
                    {draft.item_count > 0
                      ? `${draft.item_count} line item${draft.item_count !== 1 ? 's' : ''}`
                      : 'No items yet'}
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <a
                    href={`/rfq?draft=${draft.id}`}
                    className="flex-1 text-center bg-navy text-white text-xs font-bold py-2 rounded-xl hover:opacity-90 transition"
                  >
                    Resume →
                  </a>
                  <button
                    onClick={() => handleDiscard(draft.id)}
                    className="text-xs font-semibold text-text-muted hover:text-error transition px-3"
                    type="button"
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Sent Quotes ──────────────────────────────────────────── */}
      {hasSent && (
        <section>
          <h3 className="text-base font-bold text-text-primary mb-4">
            Sent Quotes
            <span className="ml-2 text-xs font-semibold text-text-muted bg-surface-subtle border border-border-subtle px-2 py-0.5 rounded-full">
              {sent.length}
            </span>
          </h3>
          <div className="flex flex-col gap-3">
            {sent.map(rfq => (
              <div
                key={rfq.id}
                className="bg-surface border border-border-subtle rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm"
              >
                {/* Left: info */}
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={rfq.status} />
                    {rfq.rfq_id_short && (
                      <span className="text-xs text-text-muted font-mono">{rfq.rfq_id_short}</span>
                    )}
                  </div>
                  <p className="font-bold text-navy text-sm truncate">
                    {rfq.supplier_name || '—'}
                    {rfq.supplier_email && (
                      <span className="font-normal text-text-muted ml-1.5">{rfq.supplier_email}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {rfq.project_reference && (
                      <span className="text-xs text-text-secondary font-medium">{rfq.project_reference}</span>
                    )}
                    <span className="text-xs text-text-muted">{formatDate(rfq.created_at)}</span>
                  </div>
                </div>

                {/* Right: status actions */}
                {rfq.status === 'sent' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleStatusUpdate(rfq.id, 'won')}
                      disabled={updatingId === rfq.id}
                      className="text-xs font-bold text-green-700 border border-green-300 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                      type="button"
                    >
                      Mark Won
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(rfq.id, 'declined')}
                      disabled={updatingId === rfq.id}
                      className="text-xs font-bold text-gray-600 border border-gray-300 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                      type="button"
                    >
                      Mark Declined
                    </button>
                  </div>
                )}

                {rfq.status !== 'sent' && (
                  <button
                    onClick={() => handleStatusUpdate(rfq.id, 'sent')}
                    disabled={updatingId === rfq.id}
                    className="text-xs font-semibold text-text-muted hover:text-navy transition shrink-0 disabled:opacity-50"
                    type="button"
                  >
                    Undo
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
