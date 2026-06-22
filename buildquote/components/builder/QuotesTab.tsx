'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Draft {
  id: string
  supplier_name: string | null
  project_reference: string | null
  created_at: string
  updated_at: string | null
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

interface RFQItem {
  id: string
  item_name: string
  quantity: number | null
  unit: string | null
  specification: string | null
  notes: string | null
  sort_order: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)   return `${days}d ago`
  return formatDate(iso)
}

function shortId(uuid: string) {
  return uuid.replace(/-/g, '').slice(0, 6).toUpperCase()
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'draft') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
      Draft
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
      Won
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

// ── Styled confirm modal ──────────────────────────────────────────────────────

interface ConfirmState {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
}

function ConfirmModal({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{state.title}</h3>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{state.message}</p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { state.onConfirm(); onClose() }}
            className="flex-1 font-bold text-sm py-2.5 rounded-xl transition"
            style={{ background: '#dc2626', color: '#ffffff' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
            onMouseLeave={e => (e.currentTarget.style.background = '#dc2626')}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QuotesTab({
  builderId,
  highlightProject,
  onClearHighlight,
}: {
  builderId: string
  highlightProject?: string
  onClearHighlight?: () => void
}) {
  const supabase = createSupabaseBrowserClient()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [sent, setSent] = useState<SentRFQ[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [discardingEmpty, setDiscardingEmpty] = useState(false)
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<RFQItem[]>([])
  const [expandedLoading, setExpandedLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    const { data: draftRows } = await supabase
      .from('rfq_drafts')
      .select('id, supplier_name, project_reference, created_at, updated_at')
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

    const countMap: Record<string, number> = {}
    for (const row of (itemCounts || []) as { draft_id: string }[]) {
      countMap[row.draft_id] = (countMap[row.draft_id] || 0) + 1
    }

    setDrafts(
      (draftRows || []).map((d: any) => ({
        ...d,
        item_count: countMap[d.id] || 0,
      }))
    )
    setSent((sentRows || []) as SentRFQ[])
    setLoading(false)
  }, [builderId])

  useEffect(() => { load() }, [load])

  async function handleDiscard(draftId: string) {
    setConfirmModal({
      title: 'Discard this draft?',
      message: 'This will permanently delete the draft and all items. This cannot be undone.',
      confirmLabel: 'Discard draft',
      onConfirm: async () => {
        await supabase.from('rfq_draft_items').delete().eq('draft_id', draftId)
        await supabase.from('rfq_drafts').delete().eq('id', draftId)
        setDrafts(d => d.filter(x => x.id !== draftId))
      },
    })
  }

  async function handleDiscardAllEmpty() {
    const emptyDrafts = drafts.filter(d => d.item_count === 0)
    setConfirmModal({
      title: `Discard ${emptyDrafts.length} empty drafts?`,
      message: 'All empty drafts will be permanently deleted. Drafts with items will not be affected.',
      confirmLabel: `Discard ${emptyDrafts.length} drafts`,
      onConfirm: async () => {
        setDiscardingEmpty(true)
        const ids = emptyDrafts.map(d => d.id)
        await supabase.from('rfq_drafts').delete().in('id', ids)
        setDrafts(d => d.filter(x => x.item_count > 0))
        setDiscardingEmpty(false)
      },
    })
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

  async function handleToggleExpand(rfqId: string) {
    if (expandedId === rfqId) {
      setExpandedId(null)
      setExpandedItems([])
      return
    }
    setExpandedId(rfqId)
    setExpandedItems([])
    setExpandedLoading(true)
    try {
      const res = await fetch(`/api/quotes/${rfqId}/items`)
      if (res.ok) {
        const data = await res.json()
        setExpandedItems(data.items || [])
      }
    } finally {
      setExpandedLoading(false)
    }
  }

  async function handleDownloadPDF(rfq: SentRFQ) {
    setDownloadingId(rfq.id)
    try {
      const res = await fetch(`/api/quotes/${rfq.id}/pdf`)
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${rfq.rfq_id_short || rfq.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingId(null)
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
  const emptyDraftCount = drafts.filter(d => d.item_count === 0).length
  const filledDrafts = drafts.filter(d => d.item_count > 0)
  const emptyDrafts = drafts.filter(d => d.item_count === 0)

  // Filter sent quotes by job if navigated from a job card
  const visibleSent = highlightProject
    ? sent.filter(r => r.project_reference === highlightProject)
    : sent

  if (!hasDrafts && !hasSent) {
    return (
      <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-12 text-center">
        <p className="text-text-muted font-semibold text-base">No quote requests yet.</p>
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
    <>
      <div className="flex flex-col gap-10">

        {/* ── Sent Quotes ──────────────────────────────────────────── */}
        {hasSent && (
          <section>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h3 className="text-base font-bold text-text-primary">
                Sent Quotes
                <span className="ml-2 text-xs font-semibold text-text-muted bg-surface-subtle border border-border-subtle px-2 py-0.5 rounded-full">
                  {sent.length}
                </span>
              </h3>
              {highlightProject && (
                <span className="inline-flex items-center gap-1.5 bg-navy/8 border border-navy/20 text-navy text-xs font-bold px-3 py-1 rounded-full">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {highlightProject}
                  <button
                    type="button"
                    onClick={onClearHighlight}
                    className="ml-0.5 text-navy/50 hover:text-navy transition"
                    aria-label="Clear filter"
                  >✕</button>
                </span>
              )}
            </div>
            {highlightProject && visibleSent.length === 0 && (
              <p className="text-sm text-text-muted py-4">No sent quotes for <strong>{highlightProject}</strong> yet.</p>
            )}
            <div className="flex flex-col gap-3 max-w-2xl">
              {visibleSent.map(rfq => {
                const isExpanded = expandedId === rfq.id
                return (
                  <div
                    key={rfq.id}
                    className="bg-surface border border-border-subtle rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Card header row — clickable */}
                    <button
                      type="button"
                      onClick={() => handleToggleExpand(rfq.id)}
                      className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-surface-subtle transition"
                    >
                      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={rfq.status} />
                          {rfq.rfq_id_short && (
                            <span className="text-xs text-text-muted font-mono bg-surface-subtle border border-border-subtle px-1.5 py-0.5 rounded">
                              {rfq.rfq_id_short}
                            </span>
                          )}
                          <span className="text-xs text-text-muted ml-auto">{timeAgo(rfq.created_at)}</span>
                        </div>
                        <p className="font-bold text-navy text-sm">
                          {rfq.supplier_name || '—'}
                        </p>
                        {rfq.supplier_email && (
                          <p className="text-xs text-text-muted truncate">{rfq.supplier_email}</p>
                        )}
                        {rfq.project_reference && (
                          <p className="text-xs text-text-secondary font-medium">{rfq.project_reference}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {rfq.status === 'sent' && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); handleStatusUpdate(rfq.id, 'won') }}
                              disabled={updatingId === rfq.id}
                              className="text-xs font-bold text-green-700 border border-green-300 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                              type="button"
                            >Won</button>
                            <button
                              onClick={e => { e.stopPropagation(); handleStatusUpdate(rfq.id, 'declined') }}
                              disabled={updatingId === rfq.id}
                              className="text-xs font-bold text-gray-600 border border-gray-300 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                              type="button"
                            >Declined</button>
                          </>
                        )}
                        {rfq.status !== 'sent' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleStatusUpdate(rfq.id, 'sent') }}
                            disabled={updatingId === rfq.id}
                            className="text-xs font-semibold text-text-muted hover:text-navy transition disabled:opacity-50"
                            type="button"
                          >Undo</button>
                        )}
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5"
                          className={`text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="border-t border-border-subtle px-4 sm:px-5 py-4 flex flex-col gap-4 bg-surface-subtle">
                        {expandedLoading ? (
                          <p className="text-sm text-text-muted">Loading items…</p>
                        ) : expandedItems.length === 0 ? (
                          <p className="text-sm text-text-muted italic">No line items recorded.</p>
                        ) : (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-2">Items</p>
                            <div className="flex flex-col gap-1.5">
                              {expandedItems.map((item, i) => (
                                <div key={item.id} className="flex items-baseline gap-3 text-sm">
                                  <span className="text-text-muted w-5 text-right shrink-0">{i + 1}.</span>
                                  <span className="font-semibold text-text-primary">{item.item_name}</span>
                                  {item.specification && <span className="text-text-muted text-xs">{item.specification}</span>}
                                  {item.notes && <span className="text-text-muted text-xs font-mono">{item.notes}</span>}
                                  <span className="ml-auto text-xs text-text-secondary shrink-0">
                                    {item.quantity != null ? item.quantity : '—'}{item.unit ? ' ' + item.unit : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(rfq)}
                          disabled={downloadingId === rfq.id}
                          className="self-start inline-flex items-center gap-2 text-xs font-bold text-white bg-navy hover:opacity-90 px-4 py-2 rounded-xl transition disabled:opacity-50"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          {downloadingId === rfq.id ? 'Generating…' : 'Download PDF'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── In-Progress Drafts ───────────────────────────────────── */}
        {hasDrafts && !highlightProject && (
          <section>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h3 className="text-base font-bold text-text-primary">
                In Progress
                <span className="ml-2 text-xs font-semibold text-text-muted bg-surface-subtle border border-border-subtle px-2 py-0.5 rounded-full">
                  {drafts.length}
                </span>
              </h3>
              {emptyDraftCount > 1 && (
                <button
                  onClick={handleDiscardAllEmpty}
                  disabled={discardingEmpty}
                  className="text-xs font-semibold text-error hover:underline disabled:opacity-50 transition"
                  type="button"
                >
                  {discardingEmpty ? 'Discarding…' : `Discard ${emptyDraftCount} empty drafts`}
                </button>
              )}
            </div>

            {/* Drafts with items */}
            {filledDrafts.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 mb-6">
                {filledDrafts.map(draft => (
                  <DraftCard key={draft.id} draft={draft} onDiscard={handleDiscard} />
                ))}
              </div>
            )}

            {/* Empty drafts — collapsed / de-emphasised */}
            {emptyDrafts.length > 0 && (
              <div>
                {filledDrafts.length > 0 && (
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                    Empty drafts ({emptyDrafts.length})
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {emptyDrafts.map(draft => (
                    <DraftCard key={draft.id} draft={draft} onDiscard={handleDiscard} empty />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Confirm modal */}
      {confirmModal && (
        <ConfirmModal
          state={confirmModal}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </>
  )
}

// ── Draft card ────────────────────────────────────────────────────────────────

function DraftCard({
  draft,
  onDiscard,
  empty = false,
}: {
  draft: Draft
  onDiscard: (id: string) => void
  empty?: boolean
}) {
  const hasSupplier     = Boolean(draft.supplier_name)
  const hasProjectRef   = Boolean(draft.project_reference)
  const lastActivity    = draft.updated_at || draft.created_at

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-3 shadow-sm transition ${
        empty
          ? 'bg-surface-subtle border-border-subtle opacity-70'
          : 'bg-surface border-amber-200'
      }`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge status="draft" />
          <span className="text-[10px] font-mono text-text-muted bg-surface-subtle border border-border-subtle px-1.5 py-0.5 rounded">
            #{shortId(draft.id)}
          </span>
        </div>
        <span className="text-xs text-text-muted font-medium shrink-0">
          {timeAgo(lastActivity)}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5">
        {/* Supplier */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {hasSupplier ? (
            <>
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-brand/50">Supplier</span>
              <span className="font-bold text-sm text-navy">{draft.supplier_name}</span>
            </>
          ) : (
            <span className="text-sm text-text-muted italic">No supplier selected</span>
          )}
        </div>
        {/* Job reference */}
        {hasProjectRef && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-brand/50">Job</span>
            <span className="text-xs text-text-secondary font-semibold">{draft.project_reference}</span>
          </div>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {empty ? (
            <span className="text-xs text-text-muted">No items added</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy bg-navy/8 border border-navy/15 px-2 py-0.5 rounded-full">
              {draft.item_count} line item{draft.item_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-0.5">
        <a
          href={`/rfq?draft=${draft.id}`}
          className={`flex-1 text-center text-xs font-bold py-2 rounded-xl transition ${
            empty
              ? 'bg-surface border border-border text-text-secondary hover:bg-surface-subtle'
              : 'bg-navy text-white hover:opacity-90'
          }`}
        >
          {empty ? 'Start →' : 'Resume →'}
        </a>
        <button
          onClick={() => onDiscard(draft.id)}
          className="text-xs font-semibold text-text-muted hover:text-error transition px-3"
          type="button"
        >
          Discard
        </button>
      </div>
    </div>
  )
}
