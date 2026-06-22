'use client'
import { useState, useRef, useEffect, useMemo } from 'react'

import Card from '../ui/Card'
import Input from '../ui/Input'
import Button from '../ui/Button'
import CheckRow from '../ui/CheckRow'
import SectionLabel from '../ui/SectionLabel'
import Toggle from '../ui/Toggle'
import { BuilderDetails, SupplierDetails, RFQPayload } from '@/lib/types'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface BuilderSupplierRow {
  id: string
  supplier_name: string | null
  supplier_email: string | null
  account_number: string | null
}

interface SupplierOption {
  id: string
  name: string
  email: string
  accountNumber: string
  isPersonal: boolean
}

interface SendScreenProps {
  rfqPayload: Omit<RFQPayload, 'rfqId'>
  onChange: (payload: Omit<RFQPayload, 'rfqId'>) => void
  onBack: () => void
  onSend: () => void
  sending: boolean
  sendError?: string
}

function validatePhone(v: string) {
  if (!v) return ''
  const digits = v.replace(/\D/g, '')
  if (digits.length < 8) return 'Phone number seems too short'
  return ''
}

function validateEmail(v: string) {
  if (!v) return ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address'
  return ''
}


export default function SendScreen({ rfqPayload, onChange, onBack, onSend, sending, sendError }: SendScreenProps) {
  const [supplierQuery, setSupplierQuery] = useState(rfqPayload.supplier.supplierName)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedFromList, setSelectedFromList] = useState(false)
  const supplierInputRef = useRef<HTMLDivElement>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pdfScale, setPdfScale] = useState(1)
  const [termsConfirmed, setTermsConfirmed] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [addressQuery, setAddressQuery] = useState(rfqPayload.siteAddress || '')
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [manualAddressEntry, setManualAddressEntry] = useState(false)
  const [addressSelected, setAddressSelected] = useState(false)
  const addressInputRef = useRef<HTMLInputElement | null>(null)
  const googleAutocompleteRef = useRef<any>(null)
  const [builderSuppliers, setBuilderSuppliers] = useState<BuilderSupplierRow[]>([])
  const [builderProfile, setBuilderProfile] = useState<any>(null)
  const [builderExpanded, setBuilderExpanded] = useState(false)
  const profileApplied = useRef(false)

  // Load saved builder details from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bq_builder_details')
      if (saved) {
        const builder = JSON.parse(saved)
        if (builder.builderName || builder.company || builder.phone || builder.email) {
          onChange({
            ...rfqPayload,
            builder: {
              ...rfqPayload.builder,
              builderName: rfqPayload.builder.builderName || builder.builderName || '',
              company: rfqPayload.builder.company || builder.company || '',
              abn: rfqPayload.builder.abn || builder.abn || '',
              phone: rfqPayload.builder.phone || builder.phone || '',
              email: rfqPayload.builder.email || builder.email || '',
            },
          })
        }
      }
    } catch (e) {
      console.error('Failed to load builder details', e)
    }
  }, [])

  // Save builder details to localStorage when they change
  useEffect(() => {
    try {
      const { builderName, company, abn, phone, email } = rfqPayload.builder
      if (builderName || company || phone || email) {
        localStorage.setItem('bq_builder_details', JSON.stringify({ builderName, company, abn, phone, email }))
      }
    } catch (e) {
      console.error('Failed to save builder details', e)
    }
  }, [rfqPayload.builder])

  // Fetch builder profile + personal suppliers if logged in
  useEffect(() => {
    const loadBuilderData = async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const [profileRes, suppliersRes] = await Promise.all([
        supabase
          .from('builders')
          .select('builder_name, company_name, abn, office_phone, mobile_phone, email')
          .eq('id', session.user.id)
          .single(),
        supabase
          .from('builder_suppliers')
          .select('id, supplier_name, supplier_email, account_number')
          .eq('builder_id', session.user.id)
          .order('supplier_name'),
      ])

      if (profileRes.data) {
        setBuilderProfile({ ...profileRes.data, userId: session.user.id, userEmail: session.user.email })
      }
      if (suppliersRes.data) {
        setBuilderSuppliers(suppliersRes.data)
      }
    }
    loadBuilderData()
  }, [])

  // Apply builder profile once it loads (overrides localStorage — profile is authoritative)
  useEffect(() => {
    if (!builderProfile || profileApplied.current) return
    profileApplied.current = true
    onChange({
      ...rfqPayload,
      builderId: builderProfile.userId,
      builder: {
        builderName: builderProfile.builder_name || rfqPayload.builder.builderName,
        company: builderProfile.company_name || rfqPayload.builder.company,
        abn: builderProfile.abn || rfqPayload.builder.abn,
        phone: builderProfile.office_phone || builderProfile.mobile_phone || rfqPayload.builder.phone,
        email: builderProfile.email || builderProfile.userEmail || rfqPayload.builder.email,
      },
    })
  }, [builderProfile, rfqPayload])

  // Restore send-screen details if user leaves and comes back.
  // Job-prefilled values (already in rfqPayload) always win over localStorage.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bq_send_screen_details')
      if (!saved) return
      const parsed = JSON.parse(saved)

      // rfqPayload fields already set (from job/supplier card) take priority
      const restoredSiteAddress = rfqPayload.siteAddress || parsed.siteAddress || ''
      let restoredSiteSuburb = rfqPayload.siteSuburb || parsed.siteSuburb || ''

      if (
        restoredSiteSuburb &&
        restoredSiteAddress &&
        restoredSiteSuburb.trim() === restoredSiteAddress.trim()
      ) {
        restoredSiteSuburb = ''
      }

      // Only restore job/supplier/address fields from localStorage if this RFQ
      // was pre-filled from a job or supplier card. Never bleed stale data into fresh sessions.
      const hasJobContext = !!(rfqPayload.supplier.supplierName || rfqPayload.siteAddress || rfqPayload.projectReference)
      onChange({
        ...rfqPayload,
        builder: { ...rfqPayload.builder, ...(parsed.builder || {}) },
        supplier: hasJobContext
          ? {
              supplierName: rfqPayload.supplier.supplierName || parsed.supplier?.supplierName || '',
              supplierEmail: rfqPayload.supplier.supplierEmail || parsed.supplier?.supplierEmail || '',
              accountNumber: rfqPayload.supplier.accountNumber || parsed.supplier?.accountNumber || '',
            }
          : rfqPayload.supplier,
        delivery: parsed.delivery ?? rfqPayload.delivery,
        dateRequired: parsed.dateRequired ?? rfqPayload.dateRequired,
        message: parsed.message ?? rfqPayload.message,
        projectReference: hasJobContext ? (rfqPayload.projectReference || parsed.projectReference || '') : rfqPayload.projectReference,
        pmName: hasJobContext ? (rfqPayload.pmName || parsed.pmName || '') : rfqPayload.pmName,
        pmPhone: hasJobContext ? (rfqPayload.pmPhone || parsed.pmPhone || '') : rfqPayload.pmPhone,
        siteAddress: hasJobContext ? restoredSiteAddress : rfqPayload.siteAddress,
        siteSuburb: hasJobContext ? restoredSiteSuburb : rfqPayload.siteSuburb,
        siteAccessNotes: hasJobContext ? (rfqPayload.siteAccessNotes || parsed.siteAccessNotes || '') : rfqPayload.siteAccessNotes,
        sendToSupplier: parsed.sendToSupplier ?? rfqPayload.sendToSupplier,
        sendCopyToSelf: parsed.sendCopyToSelf ?? rfqPayload.sendCopyToSelf,
      })
    } catch (e) {
      console.error('Failed to restore send screen details', e)
    }
  }, [])

  // Persist send-screen details while editing
  useEffect(() => {
    try {
      localStorage.setItem('bq_send_screen_details', JSON.stringify({
        builder: rfqPayload.builder,
        supplier: rfqPayload.supplier,
        delivery: rfqPayload.delivery,
        dateRequired: rfqPayload.dateRequired,
        message: rfqPayload.message,
        projectReference: rfqPayload.projectReference,
        pmName: rfqPayload.pmName,
        pmPhone: rfqPayload.pmPhone,
        siteAddress: rfqPayload.siteAddress,
        siteSuburb: rfqPayload.siteSuburb,
        siteAccessNotes: rfqPayload.siteAccessNotes,
        sendToSupplier: rfqPayload.sendToSupplier,
        sendCopyToSelf: rfqPayload.sendCopyToSelf,
      }))
    } catch (e) {
      console.error('Failed to persist send screen details', e)
    }
  }, [rfqPayload])

  useEffect(() => {
    if (rfqPayload.delivery !== 'delivery') return
    if (manualAddressEntry) return

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) {
      setAddressError('Google Maps API key is missing.')
      return
    }

    const setupAutocomplete = () => {
      if (!addressInputRef.current || !window.google?.maps?.places) return
      if (googleAutocompleteRef.current) return

      googleAutocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        componentRestrictions: { country: 'au' },
        fields: ['address_components', 'formatted_address'],
        types: ['address'],
      })

      googleAutocompleteRef.current.addListener('place_changed', () => {
        const place = googleAutocompleteRef.current?.getPlace()
        const comps = place?.address_components || []

        const findComp = (type: string) =>
          comps.find((c: any) => Array.isArray(c.types) && c.types.includes(type))

        const streetNumber = findComp('street_number')?.long_name || ''
        const route = findComp('route')?.long_name || ''
        const suburb =
          findComp('locality')?.long_name ||
          findComp('sublocality')?.long_name ||
          findComp('administrative_area_level_2')?.long_name ||
          ''

        const street = [streetNumber, route].filter(Boolean).join(' ').trim() || place?.formatted_address || ''

        setAddressQuery(street)
        setAddressError('')
        setManualAddressEntry(false)
        setAddressSelected(true)

        onChange({
          ...rfqPayload,
          siteAddress: street,
          siteSuburb: suburb,
        } as any)
      })
    }

    if (window.google?.maps?.places) {
      setupAutocomplete()
      return
    }

    const existing = document.querySelector('script[data-google-maps="true"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', setupAutocomplete)
      return () => existing.removeEventListener('load', setupAutocomplete)
    }

    setAddressLoading(true)
    setAddressError('')

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async = true
    script.defer = true
    script.setAttribute('data-google-maps', 'true')
    script.onload = () => {
      setAddressLoading(false)
      setupAutocomplete()
    }
    script.onerror = () => {
      setAddressLoading(false)
      setAddressError('Could not load Google address lookup.')
    }
    document.head.appendChild(script)

    return () => {}
  }, [rfqPayload.delivery, manualAddressEntry])


  const phoneError = validatePhone(rfqPayload.builder.phone)
  const builderEmailError = validateEmail(rfqPayload.builder.email)

  const filteredOptions: SupplierOption[] = useMemo(() => {
    if (supplierQuery.trim().length < 2 || selectedFromList) return []
    const q = supplierQuery.toLowerCase()
    return builderSuppliers
      .filter(s => s.supplier_name?.toLowerCase().includes(q))
      .slice(0, 8)
      .map(s => ({ id: s.id, name: s.supplier_name || '', email: s.supplier_email || '', accountNumber: s.account_number || '', isPersonal: true }))
  }, [supplierQuery, selectedFromList, builderSuppliers])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (supplierInputRef.current && !supplierInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  const selectSupplier = (opt: SupplierOption) => {
    setSupplierQuery(opt.name)
    setSelectedFromList(true)
    setShowSuggestions(false)
    onChange({ ...rfqPayload, supplier: { supplierName: opt.name, supplierEmail: opt.email, accountNumber: opt.accountNumber || rfqPayload.supplier.accountNumber } })
  }

  const handleSupplierNameChange = (val: string) => {
    setSupplierQuery(val)
    setSelectedFromList(false)
    setShowSuggestions(true)
    onChange({ ...rfqPayload, supplier: { ...rfqPayload.supplier, supplierName: val } })
  }

  const setBuilder = (field: keyof BuilderDetails, value: string) =>
    onChange({ ...rfqPayload, builder: { ...rfqPayload.builder, [field]: value } })

  const setSupplier = (field: keyof SupplierDetails, value: string) =>
    onChange({ ...rfqPayload, supplier: { ...rfqPayload.supplier, [field]: value } })

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewError('')
  }

  const handlePreview = async () => {
    setPreviewLoading(true)
    setPreviewError('')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rfqPayload, rfqId: 'PREVIEW' }),
      })
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'buildquote-rfq-preview.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setPreviewError('Could not generate PDF. Try again.')
    } finally {
      setPreviewLoading(false)
    }
  }

  // Compute PDF scale for mobile preview
  useEffect(() => {
    if (previewUrl) {
      const scale = Math.min(window.innerWidth / 793, 1)
      setPdfScale(scale)
      const handleResize = () => setPdfScale(Math.min(window.innerWidth / 793, 1))
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [previewUrl])

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setAddressQuery(rfqPayload.siteAddress || '')
  }, [rfqPayload.siteAddress])

  return (
    <>
      {/* PDF Preview Overlay — mobile optimised */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ui-darkest">
          <div className="flex items-center justify-between px-4 py-3 bg-ui-darker border-b border-border shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-text-primary text-sm font-semibold truncate">RFQ Preview</p>
              <p className="text-text-muted text-xs mt-0.5">Review before sending</p>
            </div>
            <button onClick={closePreview} className="text-text-muted hover:text-text-primary text-2xl leading-none px-2 shrink-0">✕</button>
          </div>
          <div className="flex-1 overflow-hidden bg-ui-darkest">
            <div style={{ width: `${793 * pdfScale}px`, height: `${1122 * pdfScale}px`, overflow: 'hidden' }}>
              <iframe src={previewUrl} className="border-0" title="RFQ Preview" style={{ width: '793px', height: '1122px', display: 'block', transformOrigin: 'top left', transform: `scale(${pdfScale})` }} />
            </div>
          </div>
          <div className="flex gap-3 px-4 py-4 bg-ui-darker border-t border-border shrink-0">
            <button onClick={closePreview} className="flex-1 py-3 rounded-xl border border-border-subtle text-text-secondary font-medium text-sm hover:bg-surface transition-colors">
              ← Edit
            </button>
            <button
              onClick={() => { closePreview(); setShowConfirm(true) }}
              disabled={sending || !rfqPayload.builder.email}
              className="flex-1 py-3 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-40 text-white font-semibold text-sm transition-colors"
            >
              {sending ? 'Sending...' : 'Send RFQ →'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:gap-4 w-full overflow-hidden">

        {/* ── Supplier Details ── (top — most critical field) */}
        <Card className="flex flex-col gap-2.5 w-full overflow-hidden">
          <SectionLabel>Supplier Details</SectionLabel>
          <div className="relative" ref={supplierInputRef}>
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-widest block mb-1">Supplier Name</label>
            <input
              value={supplierQuery}
              onChange={e => handleSupplierNameChange(e.target.value)}
              onFocus={() => { if (!selectedFromList && supplierQuery.length >= 2) setShowSuggestions(true) }}
              placeholder="Start typing a supplier name..."
              className="bg-white border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand w-full box-border text-sm"
            />
            {showSuggestions && filteredOptions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-ui-dark border border-border-subtle rounded-lg overflow-hidden shadow-xl max-h-64 overflow-y-auto">
                {filteredOptions.map(opt => (
                  <button key={opt.id} onMouseDown={e => { e.preventDefault(); selectSupplier(opt) }}
                    className="w-full text-left px-4 py-3 hover:bg-ui border-b border-border last:border-0 transition-colors">
                    <div className="flex items-center gap-2">
                      <p className="text-text-primary text-sm font-medium">{opt.name}</p>
                      {opt.isPersonal && <span className="text-xs bg-brand/10 text-brand px-1.5 py-0.5 rounded font-medium">Saved</span>}
                    </div>
                    <p className="text-text-faint text-xs mt-0.5">{opt.email || 'No email on file'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input label="Supplier Email" value={rfqPayload.supplier.supplierEmail} onChange={v => setSupplier('supplierEmail', v)} type="email" />
            <div className="flex flex-col gap-1">
              <label className="text-text-secondary text-xs font-semibold uppercase tracking-widest block">Account Number</label>
              <input value={rfqPayload.supplier.accountNumber} onChange={e => setSupplier('accountNumber', e.target.value)}
                placeholder="Trade account number if known"
                className="bg-white border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand w-full box-border text-sm" />
            </div>
          </div>
        </Card>

        {/* ── Your Details — collapsed chip when logged in and auto-filled ── */}
        {builderProfile && !builderExpanded ? (
          <Card className="w-full overflow-hidden">
            <button
              type="button"
              onClick={() => setBuilderExpanded(true)}
              className="w-full flex items-center gap-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-text-muted mb-0.5">Your Details</p>
                <p className="text-sm font-bold text-text-primary truncate">
                  {rfqPayload.builder.builderName || rfqPayload.builder.company || 'Builder'}
                  {rfqPayload.builder.company && rfqPayload.builder.builderName ? <span className="text-text-muted font-normal"> · {rfqPayload.builder.company}</span> : null}
                </p>
                <p className="text-xs text-text-muted truncate">{rfqPayload.builder.email}{rfqPayload.builder.phone ? ` · ${rfqPayload.builder.phone}` : ''}</p>
              </div>
              <span className="text-xs font-semibold text-brand shrink-0">Edit ↓</span>
            </button>
          </Card>
        ) : (
          <Card className="flex flex-col gap-2.5 w-full overflow-hidden">
            <div className="flex items-center justify-between">
              <SectionLabel>Your Details</SectionLabel>
              {builderProfile && (
                <button type="button" onClick={() => setBuilderExpanded(false)} className="text-xs text-text-muted hover:text-text-primary font-semibold transition-colors">
                  Collapse ↑
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input label="Builder Name" value={rfqPayload.builder.builderName} onChange={v => setBuilder('builderName', v)} />
              <Input label="Company Name" value={rfqPayload.builder.company} onChange={v => setBuilder('company', v)} />
            </div>
            <Input label="ABN / ACN" value={rfqPayload.builder.abn} onChange={v => setBuilder('abn', v)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs text-text-secondary font-semibold uppercase tracking-wide">Phone</label>
                <input type="tel" value={rfqPayload.builder.phone} onChange={e => setBuilder('phone', e.target.value)}
                  className="bg-white border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors w-full box-border text-sm" />
                {phoneError && <p className="text-error text-xs">{phoneError}</p>}
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs text-text-secondary font-semibold uppercase tracking-wide">Email <span className="text-error">*</span></label>
                <input type="email" value={rfqPayload.builder.email} onChange={e => setBuilder('email', e.target.value)}
                  className="bg-white border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors w-full box-border text-sm" />
                {builderEmailError && <p className="text-error text-xs">{builderEmailError}</p>}
              </div>
            </div>
          </Card>
        )}

        {/* ── Project Details ── */}
        <Card className="flex flex-col gap-2.5 w-full overflow-hidden">
          <SectionLabel>Project Details</SectionLabel>
          <Input
            label="Project Reference"
            value={rfqPayload.projectReference || ''}
            onChange={v => onChange({ ...rfqPayload, projectReference: v })}
            placeholder="e.g. Smith Residence — Wall Framing Stage"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input
              label="Project Manager Name"
              value={rfqPayload.pmName || ''}
              onChange={v => onChange({ ...rfqPayload, pmName: v })}
              placeholder="Full name"
            />
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-xs text-text-secondary font-semibold uppercase tracking-wide">Project Manager Phone</label>
              <input type="tel" value={rfqPayload.pmPhone || ''} onChange={e => onChange({ ...rfqPayload, pmPhone: e.target.value })}
                placeholder="Mobile or office number"
                className="bg-white border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors w-full box-border text-sm" />
            </div>
          </div>
        </Card>

        {/* ── Delivery ── */}
        <Card className="flex flex-col gap-2.5 w-full overflow-hidden">
          <SectionLabel>Delivery</SectionLabel>
          <Toggle value={rfqPayload.delivery} onChange={v => onChange({ ...rfqPayload, delivery: v })} />
          {rfqPayload.delivery === 'delivery' && (
            <>
              {/* Address mode toggle — both options always visible */}
              <div className="flex flex-col gap-1.5">
                <label className="text-text-secondary text-xs font-semibold uppercase tracking-widest block">Delivery Address</label>
                <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
                  <button type="button"
                    onClick={() => { setManualAddressEntry(false); setAddressSelected(false) }}
                    className={`flex-1 py-2 transition-colors ${!manualAddressEntry ? 'bg-brand text-white' : 'bg-white text-text-secondary hover:bg-surface-subtle'}`}>
                    Search address
                  </button>
                  <button type="button"
                    onClick={() => { setManualAddressEntry(true); setAddressSelected(false); onChange({ ...rfqPayload, siteAddress: addressQuery } as any) }}
                    className={`flex-1 py-2 border-l border-border transition-colors ${manualAddressEntry ? 'bg-brand text-white' : 'bg-white text-text-secondary hover:bg-surface-subtle'}`}>
                    Enter lot / street manually
                  </button>
                </div>
                <p className="text-text-faint text-[11px]">
                  {manualAddressEntry
                    ? 'Use this for new lots and street names not yet on Google Maps.'
                    : 'Start typing to search — Google will suggest matching addresses.'}
                </p>
              </div>

              {!manualAddressEntry && (
                <div className="flex flex-col gap-1">
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={addressQuery}
                    onChange={e => {
                      setAddressSelected(false)
                      setAddressQuery(e.target.value)
                      onChange({ ...rfqPayload, siteAddress: e.target.value } as any)
                    }}
                    placeholder="Start typing site address…"
                    className="bg-white border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand box-border text-sm"
                  />
                  {addressLoading && <p className="text-text-faint text-xs">Loading address lookup…</p>}
                  {addressError && <p className="text-error text-xs">{addressError}</p>}
                </div>
              )}

              {manualAddressEntry && (
                <Input label="Street / Lot Number"
                  value={rfqPayload.siteAddress || ''}
                  onChange={v => { setAddressSelected(false); onChange({ ...rfqPayload, siteAddress: v } as any) }}
                  placeholder="e.g. Lot 12 Caves Road, or 47 Smith Street" />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input label="Suburb" value={(rfqPayload as any).siteSuburb || ''} onChange={v => onChange({ ...rfqPayload, siteSuburb: v } as any)} placeholder="e.g. Dunsborough" />
                <div className="flex flex-col gap-1">
                  <label className="text-text-secondary text-xs font-semibold uppercase tracking-widest block">Date Required</label>
                  <input type="date" min={today} value={rfqPayload.dateRequired}
                    onChange={e => { const v = e.target.value; if (v >= today) onChange({ ...rfqPayload, dateRequired: v }) }}
                    className="bg-white border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand box-border text-sm w-full" />
                  <p className="text-text-faint text-xs">Approximate date materials will be required on site</p>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary font-semibold uppercase tracking-wide">Site Access Notes</label>
                <textarea value={rfqPayload.siteAccessNotes || ''} onChange={e => onChange({ ...rfqPayload, siteAccessNotes: e.target.value })}
                  placeholder="Gate code, dog on site, no trucks over 8t…"
                  rows={2}
                  className="bg-white border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand w-full box-border resize-none text-sm" />
              </div>
            </>
          )}
          {rfqPayload.delivery === 'pickup' && (
            <div className="flex flex-col gap-1">
              <label className="text-text-secondary text-xs font-semibold uppercase tracking-widest block">Date Required</label>
              <input type="date" min={today} value={rfqPayload.dateRequired}
                onChange={e => { const v = e.target.value; if (v >= today) onChange({ ...rfqPayload, dateRequired: v }) }}
                className="bg-white border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand box-border text-sm w-full sm:w-48" />
              <p className="text-text-faint text-xs">Approximate date materials will be required on site</p>
            </div>
          )}
        </Card>

        {/* ── Message + Contact + Send Options (combined compact card) ── */}
        <Card className="flex flex-col gap-3 w-full overflow-hidden">
          <SectionLabel>Message to Supplier</SectionLabel>
          <textarea value={rfqPayload.message} onChange={e => onChange({ ...rfqPayload, message: e.target.value })}
            placeholder="Any additional notes for the supplier…"
            rows={3}
            className="bg-white border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand w-full box-border resize-none text-sm" />

          <div className="border-t border-border-subtle pt-3">
            <p className="text-xs text-text-secondary font-semibold uppercase tracking-wide mb-2">Preferred Contact Method</p>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['phone', 'email', 'either'] as const).map(opt => (
                <button key={opt} type="button" onClick={() => onChange({ ...rfqPayload, preferredContact: opt })}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-r border-border last:border-r-0 ${
                    (rfqPayload.preferredContact ?? 'either') === opt ? 'bg-brand text-white' : 'bg-white text-text-secondary hover:bg-surface-subtle'
                  }`}>
                  {opt === 'phone' ? '📞 Phone' : opt === 'email' ? '✉️ Email' : '👍 Either'}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border-subtle pt-3 flex flex-col gap-1">
            <CheckRow label="Send RFQ to supplier" checked={rfqPayload.sendToSupplier !== false} onChange={v => onChange({ ...rfqPayload, sendToSupplier: v })} />
            {!rfqPayload.sendToSupplier && (
              <p className="text-text-faint text-xs ml-7 -mt-1">PDF will be generated without emailing the supplier</p>
            )}
            <CheckRow label="Send a copy to myself" checked={rfqPayload.sendCopyToSelf} onChange={v => onChange({ ...rfqPayload, sendCopyToSelf: v })} />
          </div>
        </Card>

        {sendError && (
          <div className="bg-error-bg border border-error-border rounded-lg px-4 py-3 text-error text-sm">⚠️ {sendError}</div>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onBack} className="flex-1 py-3.5">← Back</Button>
          <Button onClick={() => setShowConfirm(true)} disabled={sending || !rfqPayload.builder.email} className="flex-1 py-3.5 text-base font-bold">
            {sending ? 'Sending…' : (
              <>
                <span className="sm:hidden">Send RFQ →</span>
                <span className="hidden sm:inline">Send request for quotation →</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-page/80 px-4 pb-4 sm:pb-0">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-5 flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-text-primary font-bold text-lg">Send request to supplier</h2>
            </div>
            <div className="bg-ui-dark/60 rounded-xl p-3 border border-border">
              <p className="text-text-muted text-xs mb-1">You are sending this quote request to:</p>
              <p className="text-brand text-sm font-bold break-words">
                {rfqPayload.supplier.supplierName || 'Selected Supplier'}
              </p>
            </div>
            <p className="text-text-secondary text-xs leading-relaxed">
              This request contains the materials and quantities you have reviewed and approved. Product specifications, pack sizes, availability and pricing may vary between suppliers. Please confirm all product details and suitability directly with the supplier before placing an order. Any updates or changes should be communicated directly between you and your preferred supplier.
            </p>
            <p className="text-text-faint text-xs leading-relaxed">
              BuildQuote provides a tool for creating and sending quote requests. BuildQuote does not verify product specifications, availability, pricing or suitability for your project.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsConfirmed}
                onChange={e => setTermsConfirmed(e.target.checked)}
                className="mt-0.5 accent-brand shrink-0"
              />
              <span className="text-text-secondary text-xs leading-relaxed">
                I understand that I must confirm all materials and specifications directly with the supplier.
              </span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setTermsConfirmed(false) }}
                className="flex-1 bg-ui hover:bg-ui-hover text-text-primary text-sm font-medium py-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowConfirm(false); onSend() }}
                disabled={!termsConfirmed || sending}
                className="flex-1 bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl transition-colors"
              >
                {sending ? 'Sending...' : 'Send Quote Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
