'use client'
import { useState } from 'react'
import Button from '../ui/Button'
import { LineItem } from '@/lib/types'
import { getOrCreateDraft } from '@/lib/rfqDraft'

interface RFQScreenProps {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  onBack?: () => void
  onNext: () => void
  onManualEntry: () => void
  onUploadList: () => void
}

export default function RFQScreen({
  items,
  onChange,
  onBack,
  onNext,
  onManualEntry,
  onUploadList,
}: RFQScreenProps) {
  const [error, setError] = useState('')

  const update = (id: string, field: keyof LineItem, value: string) => {
    onChange(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
              ...((field === 'name' || field === 'qty') ? { confidence: 'high' as const } : {}),
            }
          : item
      )
    )
  }

  const remove = (id: string) => onChange(items.filter((item) => item.id !== id))

  const handleBrowseManufacturerSystems = async () => {
    try {
      setError('')
      const draft = await getOrCreateDraft()
      window.open('https://mfp.buildquote.com.au/?draft=' + draft, '_blank')
    } catch (err: any) {
      setError(err?.message || 'Could not open Manufacturer Components.')
    }
  }

  const lowCount = items.filter((i) => i.confidence === 'low').length

  const inputClass =
    'w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-heading'
  const compactInputClass =
    'w-full min-w-0 rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-heading'

  return (
    <div className="flex flex-col gap-5">
      <div className="px-1">
        <h1 className="text-heading text-3xl sm:text-4xl font-extrabold tracking-tight">Review your RFQ</h1>
        <p className="text-text-secondary text-sm sm:text-base font-medium leading-relaxed mt-3">
          Please check a few items before sending. A couple of handwritten quantities may need a quick look.
        </p>
        <p className="text-text-muted text-sm mt-2">
          {items.length} line item{items.length !== 1 ? 's' : ''}.
        </p>
        {lowCount > 0 && (
          <p className="text-warning text-sm mt-2">
            {lowCount} item{lowCount !== 1 ? 's' : ''} {lowCount === 1 ? 'needs' : 'need'} a quick check
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border-2 border-error-border bg-error-bg px-4 py-3">
          <p className="text-error text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Mobile compact list */}
      <div className="md:hidden rounded-2xl border border-border border-t-4 border-t-heading bg-white shadow-[0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        {items.length === 0 ? (
          <div className="p-4 text-sm text-text-muted">No items found yet.</div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${index < items.length - 1 ? 'border-b border-border-subtle' : ''} ${item.confidence === 'low' ? 'bg-[rgba(245,158,11,0.06)]' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary break-words whitespace-normal">{item.name}</p>
                <p className="text-xs text-text-muted break-words whitespace-normal">{[item.desc, item.sku, item.uom].filter(Boolean).join(' · ')}</p>
              </div>
              <span className="text-sm font-bold text-heading shrink-0">{item.qty}</span>
              <button onClick={() => remove(item.id)} className="shrink-0 h-7 w-7 rounded-lg text-text-muted hover:text-error hover:bg-error-bg transition-colors text-sm" aria-label={`Remove item ${index + 1}`} type="button">×</button>
            </div>
          ))
        )}
      </div>
      {/* Desktop table layout */}
      <div className="hidden md:block rounded-2xl border border-border border-t-4 border-t-heading bg-white shadow-[0_8px_24px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto md:overflow-x-hidden">
          <div className="min-w-0">
            <div className="grid grid-cols-[72px_minmax(180px,1.2fr)_minmax(240px,1.8fr)_110px_105px_92px_44px] gap-3 border-b border-border bg-surface-subtle px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Line item</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Product</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Specs</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">SKU</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">UOM</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Qty</div>
              <div />
            </div>

            {items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-text-muted">No items found yet.</div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-[72px_minmax(180px,1.2fr)_minmax(240px,1.8fr)_110px_105px_92px_44px] gap-3 px-4 py-3 ${
                    index < items.length - 1 ? 'border-b border-border-subtle' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-text-secondary">{index + 1}</span>
                  </div>

                  <div className="flex items-center">
                    <input
                      value={item.name}
                      onChange={(e) => update(item.id, 'name', e.target.value)}
                      placeholder="Product name"
                      className={`${inputClass} w-full min-w-0`}
                    />
                  </div>

                  <div className="flex items-start py-1">
                    <textarea style={{wordBreak: 'break-word'}}
                      value={item.desc}
                      onChange={(e) => update(item.id, 'desc', e.target.value)}
                      placeholder="Specs"
                      rows={2}
                      className={`${inputClass} min-h-[56px] resize-y whitespace-normal leading-snug py-3`}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      value={item.sku}
                      onChange={(e) => update(item.id, 'sku', e.target.value)}
                      placeholder="SKU"
                      className={`${compactInputClass} w-full min-w-0`}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      value={item.uom}
                      onChange={(e) => update(item.id, 'uom', e.target.value)}
                      placeholder="UOM"
                      className={`${compactInputClass} w-full min-w-0`}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      value={item.qty}
                      onChange={(e) => update(item.id, 'qty', e.target.value)}
                      placeholder="Qty"
                      className={`${compactInputClass} w-full min-w-0`}
                    />
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => remove(item.id)}
                      className="h-9 w-9 rounded-lg border border-border text-text-muted hover:text-error hover:border-error-border hover:bg-error-bg transition-colors"
                      aria-label={`Remove line item ${index + 1}`}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <Button variant="secondary" onClick={onBack} className="flex-1 py-3 border-2 border-heading/20 hover:border-heading/40">
          <span className="block text-heading">← Back</span>
          <span className="block text-xs font-medium text-heading/60">Add extra items</span>
        </Button>
        <Button onClick={onNext} disabled={items.length === 0} className="flex-1 py-3">
          <span className="block text-white font-bold text-lg">Continue →</span>
          <span className="block text-xs font-normal text-white/80">Add quote request details</span>
        </Button>
      </div>
    </div>
  )
}
