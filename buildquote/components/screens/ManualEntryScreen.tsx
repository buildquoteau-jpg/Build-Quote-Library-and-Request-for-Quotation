'use client'
import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import { LineItem } from '@/lib/types'
import { getOrCreateDraft } from '@/lib/rfqDraft'

const PARSE_MESSAGES = [
  'Reading your list...',
  'Identifying the items...',
  'Organising your lines...',
  'Checking quantities...',
  'Almost done...',
  'Nearly there...',
]

interface ManualEntryScreenProps {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  onBack?: () => void
  onNext: () => void
  onParsed: (parsed: LineItem[]) => void
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function blankItem(): LineItem {
  return {
    id: generateId(),
    name: '',
    sku: '',
    productId: '',
    desc: '',
    uom: '',
    qty: '',
    confidence: 'high',
    length_mm: null,
    width_mm: null,
    height_mm: null,
    thickness_mm: null,
    depth_mm: null,
    gauge_mm: null,
    diameter_mm: null,
    roll_m: null,
    weight_kg: null,
    pieces: null,
    coverage_m2: null,
  }
}

function findDuplicates(items: LineItem[]): Set<string> {
  const seen = new Map<string, string[]>()
  for (const item of items) {
    if (!item.name.trim()) continue
    const key = [
      item.name.trim().toLowerCase(),
      item.desc?.trim().toLowerCase() || '',
      item.sku?.trim().toLowerCase() || '',
      item.uom?.trim().toLowerCase() || '',
      item.qty?.trim().toLowerCase() || '',
    ].join('|')
    if (!seen.has(key)) seen.set(key, [])
    seen.get(key)!.push(item.id)
  }
  const dupeIds = new Set<string>()
  for (const ids of seen.values()) {
    if (ids.length > 1) ids.forEach((id) => dupeIds.add(id))
  }
  return dupeIds
}

function buildSpecs(item: LineItem): string {
  const parts: string[] = []
  if (item.height_mm) parts.push(item.height_mm + 'mm H')
  if (item.width_mm) parts.push(item.width_mm + 'mm W')
  if (item.thickness_mm) parts.push(item.thickness_mm + 'mm T')
  if (item.length_mm) parts.push(item.length_mm + 'mm L')
  if (item.depth_mm) parts.push(item.depth_mm + 'mm D')
  if (item.gauge_mm) parts.push(item.gauge_mm + 'mm gauge')
  if (item.diameter_mm) parts.push(item.diameter_mm + 'mm dia')
  if (item.roll_m) parts.push('roll ' + item.roll_m + 'm')
  if (item.weight_kg) parts.push(item.weight_kg + 'kg')
  if (item.pieces) parts.push(item.pieces + ' pcs')
  return parts.length ? parts.join(' · ') : item.desc || ''
}

export default function ManualEntryScreen({
  items,
  onChange,
  onBack,
  onNext,
  onParsed,
}: ManualEntryScreenProps) {
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [msgIndex, setMsgIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nameInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map())
  const pendingFocusId = useRef<string | null>(null)
  const duplicateIds = findDuplicates(items)

  useEffect(() => {
    if (uploading) {
      setMsgIndex(0)
      intervalRef.current = setInterval(() => {
        setMsgIndex(i => (i + 1) % PARSE_MESSAGES.length)
      }, 2800)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [uploading])

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Parse failed')
      if (!data.items?.length) throw new Error('No items found in that file. Try a clearer photo or a different format.')
      onParsed(data.items)
    } catch (err: any) {
      setUploadError(err?.message || 'Could not read the file. Try a clearer photo or a different format.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  const lowCount = items.filter((item) => item.confidence === 'low').length

  const handleClearAll = async () => {
    if (!confirm('Clear all items and start over? This cannot be undone.')) return
    onChange([blankItem()])
    try {
      const draftId = new URLSearchParams(window.location.search).get('draft')
      if (draftId) {
        await fetch('/api/save-draft-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftId, items: [] }),
        })
      }
    } catch (e) {
      console.error('Failed to clear draft', e)
    }
    // Remove draft from URL so the next session starts clean
    const url = new URL(window.location.href)
    url.searchParams.delete('draft')
    window.history.replaceState({}, '', url.toString())
  }

  useEffect(() => {
    if (items.length === 0) {
      onChange([blankItem()])
    }
  }, [items.length, onChange])

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

  const addRow = () => {
    const newItem = blankItem()
    pendingFocusId.current = newItem.id
    onChange([...(items.length ? items : [blankItem()]), newItem])
  }

  // Focus + scroll to the newly added row's Product Name field after render
  useEffect(() => {
    if (!pendingFocusId.current) return
    const el = nameInputRefs.current.get(pendingFocusId.current)
    if (el) {
      el.focus()
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      pendingFocusId.current = null
    }
  })

  const removeRow = (id: string) => {
    if (items.length <= 1) {
      onChange([blankItem()])
      return
    }
    onChange(items.filter((item) => item.id !== id))
  }

  const handleBrowseManufacturerSystems = async () => {
    try {
      setError('')
      const draft = await getOrCreateDraft()
      const mfpBase = process.env.NEXT_PUBLIC_MFP_URL ?? 'https://mfp.buildquote.com.au'
      window.open(`${mfpBase}/browse?draft=` + draft, '_blank')
    } catch (err: any) {
      setError(err?.message || 'Could not open Manufacturer Components.')
    }
  }

  const hasAtLeastOneNamedItem = items.some((item) => item.name.trim() !== '')

  const inputClass =
    'w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-heading'
  const compactInputClass =
    'w-full min-w-0 rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-heading'

  return (
    <div className="flex flex-col gap-5">
      <div className="px-1">
        <h1 className="text-heading text-3xl sm:text-4xl font-extrabold tracking-tight">
          Enter items for Request for Quotation
        </h1>
        <p className="text-text-secondary text-sm sm:text-base font-medium leading-relaxed mt-3">
          Add product name, specs, and quantity.
        </p>
        <p className="text-text-muted text-sm mt-2">
          {items.length} line item{items.length !== 1 ? 's' : ''}.
        </p>

        {(lowCount > 0 || duplicateIds.size > 0) && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">
              Please check a few items before continuing. Some quantities or duplicate-looking rows may need a quick look.
            </p>
            <p className="text-xs text-amber-800 mt-1">
              {lowCount > 0 ? `${lowCount} item${lowCount !== 1 ? 's' : ''} ${lowCount === 1 ? 'needs' : 'need'} review.` : ''}
              {lowCount > 0 && duplicateIds.size > 0 ? ' ' : ''}
              {duplicateIds.size > 0 ? 'Possible duplicates are highlighted.' : ''}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 mt-3">
          {items.length > 1 && items.some((i) => i.name.trim()) && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-error font-semibold hover:underline shrink-0"
            >
              Clear all & start over
            </button>
          )}
        </div>
      </div>

      {(error || uploadError) && (
        <div className="rounded-2xl border-2 border-error-border bg-error-bg px-4 py-3">
          <p className="text-error text-sm font-semibold">{error || uploadError}</p>
        </div>
      )}

      <div className="md:hidden flex flex-col gap-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`rounded-2xl border bg-white shadow-[0_4px_12px_rgba(0,0,0,0.04)] p-4 ${
              item.confidence === 'low' || duplicateIds.has(item.id)
                ? 'border-amber-300 bg-amber-50/40'
                : 'border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-navy border-b-2 border-teal pb-0.5">
                Item {index + 1}
              </span>
              <button
                onClick={() => removeRow(item.id)}
                className="h-8 w-8 rounded-lg border border-border text-text-muted hover:text-error hover:border-error-border hover:bg-error-bg transition-colors text-sm"
                aria-label={`Remove line item ${index + 1}`}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <input
                ref={(el) => { nameInputRefs.current.set(item.id, el) }}
                value={item.name}
                title={item.name || ''}
                onChange={(e) => update(item.id, 'name', e.target.value)}
                placeholder="Product name"
                className={inputClass}
              />
              <input
                value={item.desc || buildSpecs(item)}
                title={item.desc || buildSpecs(item) || ''}
                onChange={(e) => update(item.id, 'desc', e.target.value)}
                placeholder="Specs / description"
                className={inputClass}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={item.sku}
                  title={item.sku || ''}
                  onChange={(e) => update(item.id, 'sku', e.target.value)}
                  placeholder="SKU"
                  className={compactInputClass}
                />
                <input
                  value={item.uom}
                  title={item.uom || ''}
                  onChange={(e) => update(item.id, 'uom', e.target.value)}
                  placeholder="UOM"
                  className={compactInputClass}
                />
                <input
                  value={item.qty}
                  title={item.qty || ''}
                  onChange={(e) => update(item.id, 'qty', e.target.value)}
                  placeholder="Qty"
                  className={compactInputClass}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block rounded-2xl border border-border border-t-4 border-t-heading bg-white shadow-[0_8px_24px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[56px_2.2fr_2fr_0.8fr_0.75fr_0.6fr_44px] gap-3 border-b border-border bg-surface-subtle px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Line item</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Product</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Specs</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">SKU</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">UOM</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Qty</div>
              <div />
            </div>

            {items.map((item, index) => (
              <div
                key={item.id}
                className={`grid grid-cols-[56px_2.2fr_2fr_0.8fr_0.75fr_0.6fr_44px] gap-3 px-4 py-3 ${
                  index < items.length - 1 ? 'border-b border-border-subtle' : ''
                } ${item.confidence === 'low' || duplicateIds.has(item.id) ? 'bg-amber-50 border-l-4 border-l-amber-400' : ''}`}
              >
                <div className="flex items-center">
                  <span className="text-sm font-semibold text-text-secondary">{index + 1}</span>
                </div>

                <div className="flex items-center">
                  <input
                    ref={(el) => { nameInputRefs.current.set(item.id, el) }}
                    value={item.name}
                    title={item.name || ''}
                    onChange={(e) => update(item.id, 'name', e.target.value)}
                    placeholder="Product name"
                    className={inputClass}
                  />
                </div>

                <div className="flex items-start py-1">
                  <textarea
                    style={{ wordBreak: 'break-word' }}
                    value={item.desc || buildSpecs(item)}
                    title={item.desc || buildSpecs(item) || ''}
                    onChange={(e) => update(item.id, 'desc', e.target.value)}
                    placeholder="Specs"
                    rows={2}
                    className={`${inputClass} min-h-[56px] resize-y whitespace-normal leading-snug py-3`}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    value={item.sku}
                    title={item.sku || ''}
                    onChange={(e) => update(item.id, 'sku', e.target.value)}
                    placeholder="SKU"
                    className={compactInputClass}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    value={item.uom}
                    title={item.uom || ''}
                    onChange={(e) => update(item.id, 'uom', e.target.value)}
                    placeholder="UOM"
                    className={compactInputClass}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    value={item.qty}
                    title={item.qty || ''}
                    onChange={(e) => update(item.id, 'qty', e.target.value)}
                    placeholder="Qty"
                    className={compactInputClass}
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    onClick={() => removeRow(item.id)}
                    className="h-9 w-9 rounded-lg border border-border text-text-muted hover:text-error hover:border-error-border hover:bg-error-bg transition-colors"
                    aria-label={`Remove line item ${index + 1}`}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.csv,.xlsx,.xls,.docx,.doc,.txt"
        onChange={handleFileSelected}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="sm:flex-1 rounded-2xl border-2 border-heading/20 border-l-[3px] border-l-teal ring-1 ring-inset ring-heading/10 bg-white hover:bg-[rgba(111,236,204,0.06)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(24,93,122,0.10)] px-4 py-3.5 text-heading text-sm font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          type="button"
        >
          <span className="text-[10px] tracking-[0.2em] font-semibold text-[var(--color-accent)] block">OPTION 1</span>
          {uploading ? 'Reading list...' : 'Upload a list'}
        </button>

        <button
          onClick={handleBrowseManufacturerSystems}
          className="sm:flex-1 rounded-2xl border-2 border-heading/20 border-l-[3px] border-l-teal ring-1 ring-inset ring-heading/10 bg-white hover:bg-[rgba(111,236,204,0.06)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(24,93,122,0.10)] px-4 py-3.5 text-heading text-sm font-bold transition-all duration-200"
          type="button"
        >
          <span className="text-[10px] tracking-[0.2em] font-semibold text-[var(--color-accent)] block">OPTION 2</span>
          Add from manufacturer portal
        </button>

        <button
          onClick={addRow}
          className="sm:flex-1 rounded-2xl border-2 border-heading/20 border-l-[3px] border-l-teal ring-1 ring-inset ring-heading/10 bg-white hover:bg-[rgba(111,236,204,0.06)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(24,93,122,0.10)] px-4 py-3.5 text-heading text-sm font-bold transition-all duration-200"
          type="button"
        >
          <span className="text-[10px] tracking-[0.2em] font-semibold text-[var(--color-accent)] block">OPTION 3</span>
          Add items manually
        </button>
      </div>

      <div className="flex gap-3 pt-1">
        <Button
          onClick={onNext}
          disabled={!hasAtLeastOneNamedItem}
          className={`flex-1 py-3 transition-all duration-200 ${items.filter((i) => i.name.trim() !== '').length >= 1 ? '' : 'opacity-60'}`}
        >
          <span className="text-white font-bold">Continue — add quote details →</span>
        </Button>
      </div>

      {uploading && (
        <div className="fixed inset-0 bg-[rgba(255,255,255,0.92)] backdrop-blur-[2px] flex items-center justify-center z-50">
          <div className="w-full max-w-sm rounded-2xl border-2 border-border bg-white px-6 py-8 text-center shadow-[0_18px_40px_rgba(24,93,122,0.16)]">
            <div className="w-12 h-12 border-4 border-heading border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <p className="text-heading font-bold text-lg tracking-tight" key={msgIndex}>
              {PARSE_MESSAGES[msgIndex]}
            </p>
            <p className="text-text-secondary text-sm mt-3 font-medium">
              This usually takes 15–30 seconds
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
