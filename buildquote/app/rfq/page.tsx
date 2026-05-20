'use client'
import { useState, useEffect } from 'react'
import { getOrCreateDraft } from '@/lib/rfqDraft'
import TopBar from '@/components/ui/TopBar'
import UploadScreen from '@/components/screens/UploadScreen'
import ManualEntryScreen from '@/components/screens/ManualEntryScreen'
import RFQScreen from '@/components/screens/RFQScreen'
import SendScreen from '@/components/screens/SendScreen'
import SuccessScreen from '@/components/screens/SuccessScreen'
import { LineItem, RFQPayload } from '@/lib/types'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

function generateRFQId() {
  const year = new Date().getFullYear()
  const num = Math.floor(1000 + Math.random() * 9000)
  return `RFQ-${year}-${num}`
}

function isMeaningfulItem(item: LineItem) {
  return Boolean(
    item.name?.trim() ||
    item.sku?.trim() ||
    item.productId?.trim() ||
    item.desc?.trim() ||
    item.uom?.trim() ||
    item.qty?.trim()
  )
}

function normaliseItems(items: LineItem[]) {
  return items.filter(isMeaningfulItem)
}

function mergeItems(existing: LineItem[], incoming: LineItem[]) {
  const seen = new Set<string>()
  const merged: LineItem[] = []

  for (const item of normaliseItems([...existing, ...incoming])) {
    const key = [
      item.name || '',
      item.sku || '',
      item.productId || '',
      item.desc || '',
      item.uom || '',
      item.qty || '',
    ].join('|')

    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }

  return merged
}

const defaultPayload: Omit<RFQPayload, 'rfqId'> = {
  builder: { builderName: '', company: '', abn: '', phone: '', email: '' },
  supplier: { supplierName: '', supplierEmail: '', accountNumber: '' },
  items: [],
  delivery: 'delivery',
  dateRequired: '',
  message: '',
  projectReference: '',
  sendToSupplier: true,
  sendCopyToSelf: true,
}

export default function RFQPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [items, setItems] = useState<LineItem[]>([])
  const [payload, setPayload] = useState<Omit<RFQPayload, 'rfqId'>>(defaultPayload)
  const [rfqId, setRfqId] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [builderId, setBuilderId] = useState<string | undefined>()

  function getDraftId() {
    return new URLSearchParams(window.location.search).get('draft') ?? undefined
  }

  async function saveDraft(nextItems: LineItem[]) {
    try {
      const draftId = getDraftId()
      if (!draftId) return
      await fetch('/api/save-draft-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, items: normaliseItems(nextItems) }),
      })
    } catch (e) {
      console.error('Draft save failed', e)
    }
  }

  async function saveDraftMeta(supplierName: string, projectRef: string) {
    try {
      const draftId = getDraftId()
      if (!draftId) return
      const supabase = createSupabaseBrowserClient()
      await supabase
        .from('rfq_drafts')
        .update({
          supplier_name: supplierName || null,
          project_reference: projectRef || null,
        })
        .eq('id', draftId)
    } catch (e) {
      console.error('Draft meta save failed', e)
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  // Single init effect — fetches session, creates/loads draft, sets step + loading
  // together so React 18 batches into one render (no intermediate flash state).
  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search)
      const supplierId = params.get('supplier')
      const jobId = params.get('job')
      const existingDraftId = params.get('draft')

      // Resolve builder session
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const bId = session?.user?.id
      if (bId) setBuilderId(bId)

      // From supplier/job card — jump to step 2 immediately; prefill effect handles data
      if (supplierId || jobId) {
        if (!existingDraftId) await getOrCreateDraft(bId)
        setStep(2)
        setInitialLoading(false)
        return
      }

      // Fresh session — create draft and show upload screen
      if (!existingDraftId) {
        await getOrCreateDraft(bId)
        setInitialLoading(false)
        return
      }

      // Returning to an existing draft — always land on Enter Items (step 2),
      // even if the draft has no items yet (e.g. resumed before adding anything).
      try {
        const res = await fetch('/api/get-draft-items?draft=' + existingDraftId)
        const data = await res.json()
        const mapped = (data.items || []).map((row: any) => ({
          id: crypto.randomUUID(),
          name: row.name || '',
          sku: row.sku || '',
          productId: row.component_id || '',
          desc: row.description || '',
          uom: row.uom || '',
          qty: row.qty ? String(row.qty) : '',
          confidence: 'high' as const,
          length_mm: row.length_mm ?? null,
          width_mm: row.width_mm ?? null,
          height_mm: row.height_mm ?? null,
          thickness_mm: row.thickness_mm ?? null,
          depth_mm: row.depth_mm ?? null,
          gauge_mm: row.gauge_mm ?? null,
          diameter_mm: row.diameter_mm ?? null,
          roll_m: row.roll_m ?? null,
          weight_kg: row.weight_kg ?? null,
          pieces: row.pieces ?? null,
          coverage_m2: row.coverage_m2 ?? null,
        }))
        const cleaned = normaliseItems(mapped)
        if (cleaned.length) {
          setItems(cleaned)
          setPayload(p => ({ ...p, items: cleaned }))
        }
        // Always go to Enter Items — this is a resumed draft, not a fresh session
        setStep(2)
      } catch (e) {
        console.error('Draft load failed', e)
      }
      setInitialLoading(false)
    }
    init()
  }, [])

  // Pre-populate from ?supplier= or ?job= query params (from dashboard cards)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const supplierId = params.get('supplier')
    const jobId = params.get('job')
    if (!supplierId && !jobId) return

    const prefill = async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      if (supplierId) {
        const { data } = await supabase
          .from('builder_suppliers')
          .select('supplier_name, supplier_email, account_number')
          .eq('id', supplierId)
          .eq('builder_id', session.user.id)
          .single()
        if (data) {
          setPayload(p => ({
            ...p,
            supplier: {
              supplierName: data.supplier_name || '',
              supplierEmail: data.supplier_email || '',
              accountNumber: data.account_number || '',
            },
          }))
        }
      }

      if (jobId) {
        const { data } = await supabase
          .from('builder_jobs')
          .select('project_reference, project_address, project_address_manual')
          .eq('id', jobId)
          .eq('builder_id', session.user.id)
          .single()
        if (data) {
          setPayload(p => ({
            ...p,
            projectReference: data.project_reference || '',
            siteAddress: data.project_address || data.project_address_manual || '',
          }))
        }
      }
    }

    prefill().catch(console.error)
  }, [])

  const handleParsed = async (parsed: LineItem[]) => {
    const merged = mergeItems(items, parsed)
    setItems(merged)
    setPayload(p => ({ ...p, items: merged }))
    await saveDraft(merged)
    setStep(2)
  }

  const handleParsedOnStep2 = async (parsed: LineItem[]) => {
    const merged = mergeItems(items, parsed)
    setItems(merged)
    setPayload(p => ({ ...p, items: merged }))
    await saveDraft(merged)
  }

  const handleManualEntry = () => setStep(2)

  const handleSend = async () => {
    setSending(true)
    setSendError('')
    const id = generateRFQId()
    const fullPayload: RFQPayload = {
      ...payload,
      items,
      rfqId: id,
      builderId,
      draftId: getDraftId(),
    }

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullPayload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error ${res.status}`)
      }
      setRfqId(id)
      setStep(5)
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Something went wrong sending the RFQ.')
    } finally {
      setSending(false)
    }
  }

  const navigateToStep = async (nextStep: 1 | 2 | 3 | 4 | 5) => {
    if (step === 2) await saveDraft(items)
    setStep(nextStep)
  }

  const handleReset = () => {
    setStep(1)
    setItems([])
    setPayload(defaultPayload)
    setRfqId('')
    setSendError('')
    const url = new URL(window.location.href)
    url.searchParams.delete('draft')
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <TopBar currentStep={step} onStepClick={(s) => { void navigateToStep(s as 1 | 2 | 3 | 4 | 5) }} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {initialLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-text-secondary text-sm font-medium">Loading your quote...</div>
          </div>
        ) : (<>
        {step === 1 && <UploadScreen onNext={handleParsed} onSkip={handleManualEntry} />}

        {step === 2 && (
          <ManualEntryScreen
            items={items}
            onChange={(nextItems) => {
              setItems(nextItems)
              setPayload((p) => ({ ...p, items: nextItems }))
            }}
            onNext={async () => {
              await saveDraft(items)
              await saveDraftMeta(payload.supplier.supplierName, payload.projectReference)
              setStep(4)
            }}
            onParsed={handleParsedOnStep2}
          />
        )}

        {step === 4 && (
          <SendScreen
            rfqPayload={{ ...payload, items }}
            onChange={setPayload}
            onBack={() => setStep(2)}
            onSend={handleSend}
            sending={sending}
            sendError={sendError}
          />
        )}

        {step === 5 && (
          <SuccessScreen
            rfqId={rfqId}
            payload={{ ...payload, items, rfqId }}
            onReset={handleReset}
          />
        )}
        </>)}
      </div>
    </div>
  )
}
