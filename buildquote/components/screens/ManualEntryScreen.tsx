'use client'
import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import { LineItem } from '@/lib/types'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

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
  builderId?: string
  builderName?: string
  builderCompany?: string
  builderLogoUrl?: string
  projectReference?: string
  siteAddress?: string
  supplierName?: string
  fromJob?: boolean
  fromSupplier?: boolean
  fromMfp?: boolean
  onChangeSupplier?: (supplier: { supplierName: string; supplierEmail: string; accountNumber: string } | null) => void
  onChangeJob?: (job: { projectReference: string; siteAddress: string; pmName: string; pmPhone: string; siteAccessNotes: string; jobId: string } | null) => void
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

export default function ManualEntryScreen({
  items,
  onChange,
  onBack,
  onNext,
  onParsed,
  builderId,
  builderName,
  builderCompany,
  builderLogoUrl,
  projectReference,
  siteAddress,
  supplierName,
  fromJob,
  fromSupplier,
  fromMfp,
  onChangeSupplier,
  onChangeJob,
}: ManualEntryScreenProps) {
  const [error, setError] = useState('')
  const [showQtyTip, setShowQtyTip] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [msgIndex, setMsgIndex] = useState(0)
  const [favPickerOpen, setFavPickerOpen] = useState(false)
  const [favProducts, setFavProducts] = useState<any[]>([])
  const [favLoading, setFavLoading] = useState(false)
  const [favSelected, setFavSelected] = useState<Set<string>>(new Set())

  // Supplier picker
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false)
  const [savedSuppliers, setSavedSuppliers] = useState<any[]>([])
  const [suppliersLoading, setSuppliersLoading] = useState(false)

  // Job picker
  const [jobPickerOpen, setJobPickerOpen] = useState(false)
  const [savedJobs, setSavedJobs] = useState<any[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [creatingJob,    setCreatingJob]    = useState(false)
  const [newJobRef,      setNewJobRef]      = useState('')
  const [newJobAddr,     setNewJobAddr]     = useState('')
  const [newJobBuildType,setNewJobBuildType]= useState('')
  const [newJobPm,       setNewJobPm]       = useState('')
  const [newJobPmPhone,  setNewJobPmPhone]  = useState('')
  const [newJobAccess,   setNewJobAccess]   = useState('')
  const [newJobSaving,   setNewJobSaving]   = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nameInputRefs = useRef<Map<string, HTMLElement | null>>(new Map())
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

  const processFile = async (file: File) => {
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

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
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

  const handleOpenFavPicker = async () => {
    if (!builderId) return
    setFavPickerOpen(true)
    setFavSelected(new Set())
    if (favProducts.length === 0) {
      setFavLoading(true)
      try {
        const supabase = createSupabaseBrowserClient()
        const { data } = await supabase
          .from('builder_favourite_products')
          .select('*')
          .eq('builder_id', builderId)
          .order('product_name')
        setFavProducts(data || [])
      } finally {
        setFavLoading(false)
      }
    }
  }

  const handleAddFromFavourites = () => {
    const toAdd: LineItem[] = favProducts
      .filter(p => favSelected.has(p.id))
      .map(p => ({
        id: generateId(),
        name: p.product_name || '',
        sku: p.sku || '',
        productId: p.product_id || '',
        desc: p.description || '',
        uom: p.uom || '',
        qty: '1',
        manufacturer: p.manufacturer || '',
        system: '',
        confidence: 'high' as const,
        length_mm: null, width_mm: null, height_mm: null,
        thickness_mm: null, depth_mm: null, gauge_mm: null,
        diameter_mm: null, roll_m: null, weight_kg: null,
        pieces: null, coverage_m2: null,
      }))
    if (toAdd.length) {
      const merged = [...items.filter(i => i.name.trim()), ...toAdd]
      onChange(merged)
    }
    setFavPickerOpen(false)
  }

  const handleBrowseManufacturerSystems = () => {
    window.location.href = '/library'
  }

  const handleOpenSupplierPicker = async () => {
    if (!builderId || !onChangeSupplier) return
    setSupplierPickerOpen(true)
    if (savedSuppliers.length === 0) {
      setSuppliersLoading(true)
      try {
        const supabase = createSupabaseBrowserClient()
        const { data } = await supabase
          .from('builder_suppliers')
          .select('id, supplier_name, supplier_email, account_number')
          .eq('builder_id', builderId)
          .order('supplier_name')
        setSavedSuppliers(data || [])
      } finally {
        setSuppliersLoading(false)
      }
    }
  }

  const handleOpenJobPicker = async () => {
    if (!builderId || !onChangeJob) return
    setJobPickerOpen(true)
    if (savedJobs.length === 0) {
      setJobsLoading(true)
      try {
        const supabase = createSupabaseBrowserClient()
        const { data } = await supabase
          .from('builder_jobs')
          .select('id, project_reference, project_address, project_address_manual, pm_name, pm_mobile, site_access_notes')
          .eq('builder_id', builderId)
          .order('project_reference')
        setSavedJobs(data || [])
      } finally {
        setJobsLoading(false)
      }
    }
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!builderId || !newJobRef.trim()) return
    setNewJobSaving(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const payload = {
        builder_id: builderId,
        project_reference: newJobRef.trim(),
        project_address_manual: newJobAddr.trim(),
        build_type: newJobBuildType,
        pm_name: newJobPm.trim(),
        pm_mobile: newJobPmPhone.trim(),
        site_access_notes: newJobAccess.trim(),
      }
      const { data, error } = await supabase.from('builder_jobs').insert(payload).select('id, project_reference, project_address, project_address_manual, pm_name, pm_mobile, site_access_notes').single()
      if (error || !data) throw error
      // Add to local list and select it
      setSavedJobs(prev => [data, ...prev])
      onChangeJob?.({
        jobId: data.id,
        projectReference: data.project_reference || '',
        siteAddress: data.project_address_manual || data.project_address || '',
        pmName: data.pm_name || '',
        pmPhone: data.pm_mobile || '',
        siteAccessNotes: data.site_access_notes || '',
      })
      // Reset and close
      setNewJobRef(''); setNewJobAddr(''); setNewJobBuildType(''); setNewJobPm(''); setNewJobPmPhone(''); setNewJobAccess('')
      setCreatingJob(false)
      setJobPickerOpen(false)
    } catch {
      // keep modal open on error
    } finally {
      setNewJobSaving(false)
    }
  }

  const hasAtLeastOneNamedItem = items.some((item) => item.name.trim() !== '')

  const inputClass =
    'w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-heading'
  const compactInputClass =
    'w-full min-w-0 rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-heading'
  const qtyInputClass =
    'w-full min-w-0 rounded-lg border border-sky-300/70 bg-sky-50/60 px-2.5 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors'
  const skuInputClass =
    'w-full min-w-0 rounded-lg border border-border bg-white px-2 py-2 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-heading tracking-tight'

  useEffect(() => {
    document.querySelectorAll<HTMLTextAreaElement>('.auto-resize-ta').forEach(el => {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    })
  }, [items])

  const canEditContext = !!builderId

  return (
    <div className="flex flex-col gap-5">
      {/* Back to portal */}
      {builderId && (
        <div>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-heading transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Builder portal
          </a>
        </div>
      )}

      <div className="px-1">
        <h1 className="text-heading text-2xl sm:text-4xl font-extrabold tracking-tight">
          Your materials list
        </h1>
        <p className="text-text-secondary text-sm sm:text-base font-medium leading-relaxed mt-2">
          Review and edit each line before sending your request for quotation.
        </p>
        <p className="text-text-muted text-sm mt-2">
          {items.filter(i => i.name.trim()).length} item{items.filter(i => i.name.trim()).length !== 1 ? 's' : ''} added.
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

        {(() => {
          const routes = new Set(items.map(i => i.procurement_route).filter(Boolean))
          const isSplit = routes.has('specialist_supplier') && routes.has('trade_merchant')
          if (!isSplit) return null
          return (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">
                This system requires orders from 2 suppliers — your RFQ has been split accordingly.
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Some items must be ordered from a specialist supplier (manufacturer or distributor) and others from a local trade merchant. Review the list below and send to each supplier separately.
              </p>
            </div>
          )
        })()}

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

      {/* RFQ context bar */}
      {(builderName || projectReference || supplierName) && (
        <div className="rounded-xl border border-border bg-white shadow-sm px-3.5 py-2.5 flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand/50 shrink-0 mr-0.5">
            Your RFQ
          </span>

          {/* Builder pill — read-only */}
          {builderName && (
            <span className="inline-flex items-center gap-2 rounded-full bg-white border border-brand/20 shadow-sm px-3 py-1 text-sm text-text-primary">
              {builderLogoUrl ? (
                <img src={builderLogoUrl} alt={builderName} className="w-6 h-6 rounded-full object-contain border border-brand/10" />
              ) : (
                <span className="w-6 h-6 rounded-full bg-heading/10 flex items-center justify-center text-[10px] font-extrabold text-heading shrink-0">
                  {builderName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="font-semibold">{builderName}</span>
              {builderCompany && (
                <span className="text-text-secondary font-medium">· {builderCompany}</span>
              )}
            </span>
          )}

          {/* Job pill — editable if logged in */}
          {projectReference ? (
            canEditContext && onChangeJob ? (
              <button
                type="button"
                onClick={handleOpenJobPicker}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-brand/20 shadow-sm px-2.5 py-0.5 text-xs text-text-primary hover:border-brand/50 hover:shadow transition-all group"
              >
                <span className="text-brand/60 font-semibold uppercase tracking-wide text-[9px]">Job</span>
                <span className="font-semibold">{projectReference}</span>
                {siteAddress && (
                  <span className="text-text-secondary font-medium hidden sm:inline">· {siteAddress}</span>
                )}
                <svg className="w-3 h-3 text-text-muted group-hover:text-brand transition-colors ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-brand/20 shadow-sm px-2.5 py-0.5 text-xs text-text-primary">
                <span className="text-brand/60 font-semibold uppercase tracking-wide text-[9px]">Job</span>
                <span className="font-semibold">{projectReference}</span>
                {siteAddress && (
                  <span className="text-text-secondary font-medium hidden sm:inline">· {siteAddress}</span>
                )}
              </span>
            )
          ) : canEditContext && onChangeJob ? (
            <button
              type="button"
              onClick={handleOpenJobPicker}
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-dashed border-brand/30 px-2.5 py-0.5 text-xs text-text-muted hover:border-brand/50 hover:text-brand transition-all"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add job
            </button>
          ) : null}

          {/* Supplier pill — editable if logged in */}
          {supplierName ? (
            canEditContext && onChangeSupplier ? (
              <button
                type="button"
                onClick={handleOpenSupplierPicker}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-brand/20 shadow-sm px-2.5 py-0.5 text-xs text-text-primary hover:border-brand/50 hover:shadow transition-all group"
              >
                <span className="text-brand/60 font-semibold uppercase tracking-wide text-[9px]">
                  {fromMfp ? 'MFP' : 'Supplier'}
                </span>
                <span className="font-semibold">{supplierName}</span>
                <svg className="w-3 h-3 text-text-muted group-hover:text-brand transition-colors ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-brand/20 shadow-sm px-2.5 py-0.5 text-xs text-text-primary">
                <span className="text-brand/60 font-semibold uppercase tracking-wide text-[9px]">
                  {fromMfp ? 'MFP' : 'Supplier'}
                </span>
                <span className="font-semibold">{supplierName}</span>
              </span>
            )
          ) : canEditContext && onChangeSupplier ? (
            <button
              type="button"
              onClick={handleOpenSupplierPicker}
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-dashed border-brand/30 px-2.5 py-0.5 text-xs text-text-muted hover:border-brand/50 hover:text-brand transition-all"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add supplier
            </button>
          ) : null}
        </div>
      )}

      {/* Show context bar even when all pills are empty but user is logged in */}
      {!(builderName || projectReference || supplierName) && canEditContext && (onChangeJob || onChangeSupplier) && (
        <div className="rounded-xl border border-border bg-white shadow-sm px-3.5 py-2.5 flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand/50 shrink-0 mr-0.5">
            Your RFQ
          </span>
          {onChangeJob && (
            <button
              type="button"
              onClick={handleOpenJobPicker}
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-dashed border-brand/30 px-2.5 py-0.5 text-xs text-text-muted hover:border-brand/50 hover:text-brand transition-all"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add job
            </button>
          )}
          {onChangeSupplier && (
            <button
              type="button"
              onClick={handleOpenSupplierPicker}
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-dashed border-brand/30 px-2.5 py-0.5 text-xs text-text-muted hover:border-brand/50 hover:text-brand transition-all"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add supplier
            </button>
          )}
        </div>
      )}

      {(error || uploadError) && (
        <div className="rounded-2xl border-2 border-error-border bg-error-bg px-4 py-3">
          <p className="text-error text-sm font-semibold">{error || uploadError}</p>
        </div>
      )}

      {showQtyTip && items.some(i => i.name.trim()) && (
        <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/[0.04] px-4 py-3">
          <p className="text-sm text-text-secondary flex-1 leading-relaxed">
            Quantities are set to 1 by default — review each line and adjust to match your project requirements before sending.
          </p>
          <button
            type="button"
            onClick={() => setShowQtyTip(false)}
            aria-label="Dismiss"
            className="text-text-faint hover:text-text-primary transition-colors flex-shrink-0 text-xl leading-none px-1 mt-0.5"
          >
            ×
          </button>
        </div>
      )}

      {/* Mobile card view */}
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
              <div>
                <input
                  ref={(el) => { nameInputRefs.current.set(item.id, el) }}
                  value={item.name}
                  title={item.name || ''}
                  onChange={(e) => update(item.id, 'name', e.target.value)}
                  placeholder="Product name"
                  className={inputClass}
                />
                {(item.manufacturer || item.system) && (
                  <p className="text-[11px] text-text-muted font-medium mt-0.5 px-1 truncate">
                    {[item.manufacturer, item.system].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <input
                value={item.desc}
                title={item.desc || ''}
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
                  className={skuInputClass}
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
                  className={qtyInputClass}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block rounded-2xl border border-border border-t-4 border-t-heading bg-white shadow-[0_8px_24px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[40px_2.1fr_1.6fr_1.2fr_0.6fr_0.55fr_38px] gap-3 border-b border-border bg-surface-subtle px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">#</div>
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
                className={`grid grid-cols-[40px_2.1fr_1.6fr_1.2fr_0.6fr_0.55fr_38px] gap-3 px-4 py-3 ${
                  index < items.length - 1 ? 'border-b border-border-subtle' : ''
                } ${item.confidence === 'low' || duplicateIds.has(item.id) ? 'bg-amber-50 border-l-4 border-l-amber-400' : ''}`}
              >
                <div className="flex items-center">
                  <span className="text-sm font-semibold text-text-secondary">{index + 1}</span>
                </div>

                <div className="flex items-start py-1">
                  <div className="w-full">
                    <textarea
                      ref={(el) => { nameInputRefs.current.set(item.id, el) }}
                      value={item.name}
                      title={item.name || ''}
                      onChange={(e) => update(item.id, 'name', e.target.value)}
                      placeholder="Product name"
                      rows={1}
                      className={`auto-resize-ta ${inputClass} resize-none overflow-hidden min-h-[38px] leading-snug py-2 whitespace-normal`}
                    />
                    {(item.manufacturer || item.system) && (
                      <p className="text-[11px] text-text-muted font-medium mt-0.5 px-1 truncate">
                        {[item.manufacturer, item.system].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start py-1">
                  <textarea
                    style={{ wordBreak: 'break-word' }}
                    value={item.desc}
                    title={item.desc || ''}
                    onChange={(e) => update(item.id, 'desc', e.target.value)}
                    placeholder="Specs / dimensions"
                    rows={1}
                    className={`auto-resize-ta ${inputClass} resize-none overflow-hidden min-h-[38px] whitespace-normal leading-snug py-2`}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    value={item.sku}
                    title={item.sku || ''}
                    onChange={(e) => update(item.id, 'sku', e.target.value)}
                    placeholder="SKU"
                    className={skuInputClass}
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
                    className={qtyInputClass}
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

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault()
            setIsDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) processFile(file)
          }}
          className={`sm:flex-1 rounded-2xl border-2 border-l-[3px] border-l-teal ring-1 ring-inset px-4 py-3.5 text-heading text-sm font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
            isDragging
              ? 'border-brand bg-[rgba(24,93,122,0.06)] ring-brand/20 shadow-[0_6px_20px_rgba(24,93,122,0.18)] scale-[1.01]'
              : 'border-heading/20 ring-heading/10 bg-white hover:bg-[rgba(111,236,204,0.06)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(24,93,122,0.10)]'
          }`}
          type="button"
        >
          <span className="block font-bold">
            {isDragging ? 'Drop to upload…' : uploading ? 'Reading list...' : 'Upload a list'}
          </span>
          <span className="block text-xs font-normal text-text-muted mt-0.5">
            Photo, PDF, CSV or spreadsheet
          </span>
        </button>

        <button
          onClick={handleBrowseManufacturerSystems}
          className="sm:flex-1 rounded-2xl border-2 border-heading/20 border-l-[3px] border-l-teal ring-1 ring-inset ring-heading/10 bg-white hover:bg-[rgba(111,236,204,0.06)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(24,93,122,0.10)] px-4 py-3.5 text-heading text-sm font-bold transition-all duration-200"
          type="button"
        >
          <span className="block font-bold">Browse manufacturer products</span>
          <span className="block text-xs font-normal text-text-muted mt-0.5">Search 50+ systems</span>
        </button>

        <button
          onClick={addRow}
          className="sm:flex-1 rounded-2xl border-2 border-heading/20 border-l-[3px] border-l-teal ring-1 ring-inset ring-heading/10 bg-white hover:bg-[rgba(111,236,204,0.06)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(24,93,122,0.10)] px-4 py-3.5 text-heading text-sm font-bold transition-all duration-200"
          type="button"
        >
          <span className="block font-bold">Add items manually</span>
          <span className="block text-xs font-normal text-text-muted mt-0.5">Type one line at a time</span>
        </button>

        {builderId && (
          <button
            onClick={handleOpenFavPicker}
            className="sm:flex-1 rounded-2xl border-2 border-heading/20 border-l-[3px] border-l-teal ring-1 ring-inset ring-heading/10 bg-white hover:bg-[rgba(111,236,204,0.06)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(24,93,122,0.10)] px-4 py-3.5 text-heading text-sm font-bold transition-all duration-200 flex items-center gap-2 justify-center"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>
              <span className="block font-bold">My favourites</span>
              <span className="block text-xs font-normal text-text-muted mt-0.5">From your saved products</span>
            </span>
          </button>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <Button
          onClick={onNext}
          disabled={!hasAtLeastOneNamedItem}
          className={`flex-1 py-3.5 transition-all duration-200 ${items.filter((i) => i.name.trim() !== '').length >= 1 ? '' : 'opacity-60'}`}
        >
          <span className="text-white font-bold sm:hidden">Continue →</span>
          <span className="text-white font-bold hidden sm:inline">Continue — add RFQ details →</span>
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

      {/* ── My Favourites picker ──────────────────────────────────── */}
      {favPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setFavPickerOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text-primary">My favourite products</h3>
                <p className="text-xs text-text-muted mt-0.5">Tap to select the items to add to this list</p>
              </div>
              <button
                type="button"
                onClick={() => setFavPickerOpen(false)}
                className="w-8 h-8 rounded-lg border border-border text-text-muted hover:text-text-primary flex items-center justify-center text-lg"
              >×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              {favLoading && (
                <p className="text-sm text-text-muted text-center py-8">Loading your products…</p>
              )}
              {!favLoading && favProducts.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm font-semibold text-text-muted">No favourite products saved yet.</p>
                  <p className="text-xs text-text-muted mt-1">Save products from your dashboard to use them here.</p>
                </div>
              )}
              {favProducts.map(p => {
                const selected = favSelected.has(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFavSelected(s => {
                      const next = new Set(s)
                      selected ? next.delete(p.id) : next.add(p.id)
                      return next
                    })}
                    className={`w-full text-left rounded-xl border-2 p-3.5 transition-all ${
                      selected
                        ? 'border-heading bg-heading/[0.04] shadow-sm'
                        : 'border-border bg-white hover:border-heading/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        selected ? 'border-heading bg-heading' : 'border-border'
                      }`}>
                        {selected && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="2 6 5 9 10 3"/>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-text-primary leading-tight">{p.product_name}</p>
                        {p.manufacturer && <p className="text-xs text-brand font-semibold mt-0.5">{p.manufacturer}</p>}
                        {p.sku && <p className="text-xs text-text-muted font-mono mt-0.5">SKU: {p.sku}</p>}
                        {p.description && <p className="text-xs text-text-secondary mt-1 line-clamp-1">{p.description}</p>}
                        <div className="flex gap-2 mt-1">
                          {p.uom && <span className="text-[10px] font-semibold text-text-muted bg-surface-subtle px-1.5 py-0.5 rounded">{p.uom}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="px-5 py-4 border-t border-border flex gap-3">
              <button
                type="button"
                onClick={() => setFavPickerOpen(false)}
                className="flex-1 border border-border text-text-secondary font-semibold text-sm py-3 rounded-xl hover:bg-surface-subtle transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddFromFavourites}
                disabled={favSelected.size === 0}
                className="flex-1 bg-heading text-white font-bold text-sm py-3 rounded-xl hover:opacity-90 disabled:opacity-40 transition"
              >
                {favSelected.size === 0 ? 'Select items' : `Add ${favSelected.size} item${favSelected.size !== 1 ? 's' : ''} →`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Supplier picker ──────────────────────────────────── */}
      {supplierPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSupplierPickerOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[75vh] flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text-primary">Choose a supplier</h3>
                <p className="text-xs text-text-muted mt-0.5">Select from your saved suppliers</p>
              </div>
              <button
                type="button"
                onClick={() => setSupplierPickerOpen(false)}
                className="w-8 h-8 rounded-lg border border-border text-text-muted hover:text-text-primary flex items-center justify-center text-lg"
              >×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              {suppliersLoading && (
                <p className="text-sm text-text-muted text-center py-8">Loading your suppliers…</p>
              )}
              {!suppliersLoading && savedSuppliers.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm font-semibold text-text-muted">No suppliers saved yet.</p>
                  <p className="text-xs text-text-muted mt-1">Add suppliers from your dashboard.</p>
                </div>
              )}
              {savedSuppliers.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onChangeSupplier?.({
                      supplierName: s.supplier_name || '',
                      supplierEmail: s.supplier_email || '',
                      accountNumber: s.account_number || '',
                    })
                    setSupplierPickerOpen(false)
                  }}
                  className="w-full text-left rounded-xl border-2 border-border bg-white hover:border-heading/40 hover:bg-heading/[0.02] p-3.5 transition-all"
                >
                  <p className="font-bold text-sm text-text-primary">{s.supplier_name}</p>
                  {s.supplier_email && <p className="text-xs text-text-muted mt-0.5">{s.supplier_email}</p>}
                  {s.account_number && <p className="text-xs text-brand font-semibold mt-0.5">Acct: {s.account_number}</p>}
                </button>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-border flex gap-3">
              <button
                type="button"
                onClick={() => setSupplierPickerOpen(false)}
                className="flex-1 border border-border text-text-secondary font-semibold text-sm py-3 rounded-xl hover:bg-surface-subtle transition"
              >
                Cancel
              </button>
              {supplierName && (
                <button
                  type="button"
                  onClick={() => {
                    onChangeSupplier?.(null)
                    setSupplierPickerOpen(false)
                  }}
                  className="flex-1 border border-error-border text-error font-semibold text-sm py-3 rounded-xl hover:bg-error-bg transition"
                >
                  Remove supplier
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Job picker ──────────────────────────────────── */}
      {jobPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setJobPickerOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {creatingJob ? 'Create a new job' : 'Choose a job'}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {creatingJob ? 'Fill in the details below' : 'Select from your job cards'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setJobPickerOpen(false); setCreatingJob(false) }}
                className="w-8 h-8 rounded-lg border border-border text-text-muted hover:text-text-primary flex items-center justify-center text-lg"
              >×</button>
            </div>

            {/* Create new job form */}
            {creatingJob ? (
              <form onSubmit={handleCreateJob} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Project Reference <span className="text-error">*</span></label>
                  <input
                    required autoFocus
                    value={newJobRef} onChange={e => setNewJobRef(e.target.value)}
                    placeholder="e.g. Smith Residence 2025"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Project Address</label>
                  <input
                    value={newJobAddr} onChange={e => setNewJobAddr(e.target.value)}
                    placeholder="Lot 42 Smith St, Dunsborough WA 6281"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Build Type</label>
                  <select
                    value={newJobBuildType} onChange={e => setNewJobBuildType(e.target.value)}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition bg-white"
                  >
                    <option value="">Select type…</option>
                    {['New Home','Renovation','Extension','Swimming Pool','Landscape','Commercial','Other'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">PM Name</label>
                    <input
                      value={newJobPm} onChange={e => setNewJobPm(e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">PM Mobile</label>
                    <input
                      value={newJobPmPhone} onChange={e => setNewJobPmPhone(e.target.value)}
                      placeholder="0400 000 000"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Site Access Notes</label>
                  <textarea
                    value={newJobAccess} onChange={e => setNewJobAccess(e.target.value)}
                    placeholder="Gate code, dog on site, etc."
                    rows={2}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-1 pb-2">
                  <button type="button" onClick={() => setCreatingJob(false)}
                    className="flex-1 border border-border text-text-secondary font-semibold text-sm py-3 rounded-xl hover:bg-surface-subtle transition">
                    ← Back
                  </button>
                  <button type="submit" disabled={newJobSaving || !newJobRef.trim()}
                    className="flex-1 bg-navy text-white font-bold text-sm py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition">
                    {newJobSaving ? 'Saving…' : 'Save & select job'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Job list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                  {jobsLoading && <p className="text-sm text-text-muted text-center py-8">Loading your jobs…</p>}
                  {!jobsLoading && savedJobs.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm font-semibold text-text-muted">No jobs saved yet.</p>
                      <p className="text-xs text-text-muted mt-1">Create one below to link it to this RFQ.</p>
                    </div>
                  )}
                  {savedJobs.map(j => {
                    const addr = j.project_address || j.project_address_manual || ''
                    return (
                      <button key={j.id} type="button"
                        onClick={() => {
                          onChangeJob?.({ jobId: j.id, projectReference: j.project_reference || '', siteAddress: addr, pmName: j.pm_name || '', pmPhone: j.pm_mobile || '', siteAccessNotes: j.site_access_notes || '' })
                          setJobPickerOpen(false)
                        }}
                        className="w-full text-left rounded-xl border-2 border-border bg-white hover:border-heading/40 hover:bg-heading/[0.02] p-3.5 transition-all"
                      >
                        <p className="font-bold text-sm text-text-primary">{j.project_reference || 'Unnamed job'}</p>
                        {addr && <p className="text-xs text-text-muted mt-0.5">{addr}</p>}
                        {j.pm_name && <p className="text-xs text-brand font-semibold mt-0.5">PM: {j.pm_name}</p>}
                      </button>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-border flex gap-3">
                  <button type="button" onClick={() => setJobPickerOpen(false)}
                    className="flex-1 border border-border text-text-secondary font-semibold text-sm py-3 rounded-xl hover:bg-surface-subtle transition">
                    Cancel
                  </button>
                  {projectReference && (
                    <button type="button" onClick={() => { onChangeJob?.(null); setJobPickerOpen(false) }}
                      className="flex-1 border border-error-border text-error font-semibold text-sm py-3 rounded-xl hover:bg-error-bg transition">
                      Remove job
                    </button>
                  )}
                  <button type="button" onClick={() => setCreatingJob(true)}
                    className="flex-1 bg-navy text-white font-bold text-sm py-3 rounded-xl hover:opacity-90 transition">
                    + New job
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
