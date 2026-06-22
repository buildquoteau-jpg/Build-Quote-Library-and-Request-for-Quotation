'use client'
import { useState, useEffect } from 'react'
import { getOrCreateDraft } from '@/lib/rfqDraft'
import TopBar from '@/components/ui/TopBar'
import ManualEntryScreen from '@/components/screens/ManualEntryScreen'
import SendScreen from '@/components/screens/SendScreen'
import SuccessScreen from '@/components/screens/SuccessScreen'
import { LineItem, RFQPayload } from '@/lib/types'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

/** Build a dimension string from a raw Supabase draft-item row */
function buildDimString(row: any): string {
  const parts: string[] = []
  if (row.height_mm)    parts.push(row.height_mm    + 'mm H')
  if (row.width_mm)     parts.push(row.width_mm     + 'mm W')
  if (row.thickness_mm) parts.push(row.thickness_mm + 'mm T')
  if (row.length_mm)    parts.push(row.length_mm    + 'mm L')
  if (row.depth_mm)     parts.push(row.depth_mm     + 'mm D')
  if (row.gauge_mm)     parts.push(row.gauge_mm     + 'mm gauge')
  if (row.diameter_mm)  parts.push(row.diameter_mm  + 'mm dia')
  if (row.roll_m)       parts.push('roll ' + row.roll_m + 'm')
  if (row.weight_kg)    parts.push(row.weight_kg    + 'kg')
  if (row.pieces)       parts.push(row.pieces       + ' pcs')
  return parts.join(' · ')
}

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
  pmName: '',
  pmPhone: '',
  siteAccessNotes: '',
  preferredContact: 'either',
}

export default function RFQPage() {
  const [step, setStep] = useState<2 | 3 | 4 | 5>(2)
  const [items, setItems] = useState<LineItem[]>([])
  const [payload, setPayload] = useState<Omit<RFQPayload, 'rfqId'>>(defaultPayload)
  const [rfqId, setRfqId] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [builderId, setBuilderId] = useState<string | undefined>()
  const [builderName, setBuilderName] = useState('')
  const [builderCompany, setBuilderCompany] = useState('')
  const [builderLogoUrl, setBuilderLogoUrl] = useState('')
  const [contextFlags, setContextFlags] = useState({ fromJob: false, fromSupplier: false, fromMfp: false })
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)

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

  async function saveDraftMeta(supplierName: string, projectRef: string, jobId?: string | null) {
    try {
      const draftId = getDraftId()
      if (!draftId) return
      const supabase = createSupabaseBrowserClient()
      await supabase
        .from('rfq_drafts')
        .update({
          supplier_name: supplierName || null,
          project_reference: projectRef || null,
          ...(jobId !== undefined ? { job_id: jobId || null } : {}),
        })
        .eq('id', draftId)
    } catch (e) {
      console.error('Draft meta save failed', e)
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  // Single init effect — fetches session, loads draft, and pre-populates job/supplier
  // data all before setting initialLoading=false, so step 2 always opens with full data.
  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search)
      const supplierId = params.get('supplier')
      const jobId = params.get('job')
      const existingDraftId = params.get('draft')
      // Supplier prefill from manufacturer portal (?supplierName=)
      const supplierNameParam  = params.get('supplierName')
      const supplierEmailParam = params.get('supplierEmail')

      // Set context flags for ManualEntryScreen reminder banner
      setContextFlags({
        fromJob: !!jobId,
        fromSupplier: !!supplierId,
        fromMfp: !!supplierNameParam,
      })

      // Resolve builder session
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const bId = session?.user?.id
      if (bId) {
        setBuilderId(bId)
        // Fetch builder name + company for context reminder banner
        const { data: pd } = await supabase
          .from('builders')
          .select('builder_name, company_name, logo_url')
          .eq('id', bId)
          .single()
        if (pd?.builder_name) setBuilderName(pd.builder_name)
        if (pd?.company_name) setBuilderCompany(pd.company_name)
        if (pd?.logo_url) setBuilderLogoUrl(pd.logo_url)
      }

      // From a job card or supplier card — fetch job/supplier data NOW, before
      // showing step 2, so the payload is fully populated when SendScreen renders.
      if (supplierId || jobId) {
        if (!existingDraftId) await getOrCreateDraft(bId)

        // Fetch job + supplier data in parallel
        const [jobResult, supplierResult] = await Promise.all([
          jobId && bId
            ? supabase
                .from('builder_jobs')
                .select('project_reference, project_address, project_address_manual, pm_name, pm_mobile, site_access_notes')
                .eq('id', jobId)
                .eq('builder_id', bId)
                .single()
            : Promise.resolve({ data: null }),
          supplierId && bId
            ? supabase
                .from('builder_suppliers')
                .select('supplier_name, supplier_email, account_number')
                .eq('id', supplierId)
                .eq('builder_id', bId)
                .single()
            : Promise.resolve({ data: null }),
        ])

        const resolvedSupplierName =
          supplierResult.data?.supplier_name || supplierNameParam || ''
        const resolvedProjectRef =
          jobResult.data?.project_reference || ''

        setPayload(p => ({
          ...p,
          // Job fields
          ...(jobResult.data ? {
            projectReference: jobResult.data.project_reference || '',
            siteAddress: jobResult.data.project_address || jobResult.data.project_address_manual || '',
            pmName: jobResult.data.pm_name || '',
            pmPhone: jobResult.data.pm_mobile || '',
            siteAccessNotes: jobResult.data.site_access_notes || '',
          } : {}),
          // Supplier from dashboard card (?supplier=)
          ...(supplierResult.data ? {
            supplier: {
              supplierName: supplierResult.data.supplier_name || '',
              supplierEmail: supplierResult.data.supplier_email || '',
              accountNumber: supplierResult.data.account_number || '',
            },
          } : {}),
          // Supplier from manufacturer portal (?supplierName=)
          ...(supplierNameParam ? {
            supplier: {
              supplierName: supplierNameParam,
              supplierEmail: supplierEmailParam || '',
              accountNumber: p.supplier?.accountNumber || '',
            },
          } : {}),
        }))

        if (jobId) setCurrentJobId(jobId)

        // Save supplier/job context to draft immediately so the My Quote Requests
        // card shows context even if the user doesn't proceed to step 4.
        // Also save job_id so the full job data can be re-fetched on any future resume.
        await saveDraftMeta(resolvedSupplierName, resolvedProjectRef, jobId || null)

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
        // Load draft metadata + items in parallel
        const [itemsRes, { data: draftMeta }] = await Promise.all([
          fetch('/api/get-draft-items?draft=' + existingDraftId),
          supabase
            .from('rfq_drafts')
            .select('supplier_name, project_reference, job_id')
            .eq('id', existingDraftId)
            .single(),
        ])
        const res = itemsRes
        const data = await res.json()

        // If draft has a job_id and we're logged in, re-fetch all job fields
        let jobData: any = null
        if (draftMeta?.job_id) setCurrentJobId(draftMeta.job_id)
        if (draftMeta?.job_id && bId) {
          const { data: jd } = await supabase
            .from('builder_jobs')
            .select('project_reference, project_address, project_address_manual, pm_name, pm_mobile, site_access_notes')
            .eq('id', draftMeta.job_id)
            .eq('builder_id', bId)
            .single()
          jobData = jd
          if (jobData) {
            setContextFlags(f => ({ ...f, fromJob: true }))
          }
        }
        const mapped = (data.items || []).map((row: any) => {
          const dimStr = buildDimString(row)
          const descParts = [row.description, dimStr].filter(Boolean)
          return {
            id: crypto.randomUUID(),
            name: row.name || '',
            sku: row.sku || '',
            productId: row.component_id || '',
            desc: descParts.join(' · '),
            uom: row.uom || '',
            qty: row.qty ? String(row.qty) : '',
            manufacturer: row.manufacturer || '',
            system: row.system || '',
            confidence: 'high' as const,
            procurement_route: row.procurement_route ?? null,
            // Dimension fields nulled — merged into desc above
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
          }
        })
        const cleaned = normaliseItems(mapped)
        setPayload(p => ({
          ...p,
          ...(cleaned.length ? { items: cleaned } : {}),
          // Restore job fields from re-fetched job data (survives MFP navigation)
          ...(jobData ? {
            projectReference: jobData.project_reference || '',
            siteAddress: jobData.project_address || jobData.project_address_manual || '',
            pmName: jobData.pm_name || '',
            pmPhone: jobData.pm_mobile || '',
            siteAccessNotes: jobData.site_access_notes || '',
          } : {
            // Fall back to saved draft meta for project ref if no job data
            projectReference: p.projectReference || draftMeta?.project_reference || '',
          }),
          // Supplier: URL params win (returning from MFP), else saved draft meta
          supplier: supplierNameParam ? {
            supplierName: supplierNameParam,
            supplierEmail: supplierEmailParam || '',
            accountNumber: p.supplier.accountNumber,
          } : draftMeta?.supplier_name ? {
            supplierName: draftMeta.supplier_name,
            supplierEmail: p.supplier.supplierEmail,
            accountNumber: p.supplier.accountNumber,
          } : p.supplier,
        }))
        if (cleaned.length) setItems(cleaned)
        // If returning from MFP with a supplier name, save it to the draft
        // so the My Quote Requests card shows the context immediately.
        if (supplierNameParam) {
          await saveDraftMeta(supplierNameParam, '')
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

  const handleParsed = async (parsed: LineItem[]) => {
    const merged = mergeItems(items, parsed)
    setItems(merged)
    setPayload(p => ({ ...p, items: merged }))
    await saveDraft(merged)
  }

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

  const navigateToStep = async (nextStep: 2 | 3 | 4 | 5) => {
    if (step === 2) await saveDraft(items)
    setStep(nextStep)
  }

  const handleReset = () => {
    setStep(2)
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
      <TopBar currentStep={step} onStepClick={(s) => { void navigateToStep(s as 2 | 3 | 4 | 5) }} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {initialLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-text-secondary text-sm font-medium">Loading your quote...</div>
          </div>
        ) : (<>
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
            onParsed={handleParsed}
            builderId={builderId}
            builderName={builderName}
            builderCompany={builderCompany}
            builderLogoUrl={builderLogoUrl}
            projectReference={payload.projectReference}
            siteAddress={payload.siteAddress || ''}
            supplierName={payload.supplier.supplierName}
            fromJob={contextFlags.fromJob}
            fromSupplier={contextFlags.fromSupplier}
            fromMfp={contextFlags.fromMfp}
            onChangeSupplier={async (supplier) => {
              const next = supplier ?? { supplierName: '', supplierEmail: '', accountNumber: '' }
              setPayload(p => ({ ...p, supplier: next }))
              await saveDraftMeta(next.supplierName, payload.projectReference, currentJobId)
            }}
            onChangeJob={async (job) => {
              if (job) {
                setCurrentJobId(job.jobId)
                setPayload(p => ({
                  ...p,
                  projectReference: job.projectReference,
                  siteAddress: job.siteAddress,
                  pmName: job.pmName,
                  pmPhone: job.pmPhone,
                  siteAccessNotes: job.siteAccessNotes,
                }))
                setContextFlags(f => ({ ...f, fromJob: true }))
                await saveDraftMeta(payload.supplier.supplierName, job.projectReference, job.jobId)
              } else {
                setCurrentJobId(null)
                setPayload(p => ({
                  ...p,
                  projectReference: '',
                  siteAddress: '',
                  pmName: '',
                  pmPhone: '',
                  siteAccessNotes: '',
                }))
                setContextFlags(f => ({ ...f, fromJob: false }))
                await saveDraftMeta(payload.supplier.supplierName, '', null)
              }
            }}
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
