'use client'

import type { SupabaseClient } from '@supabase/supabase-js'

export interface GuestJob {
  id: string
  project_reference: string
  project_address: string
  project_address_place_id: string
  project_address_manual: string
  pm_name: string
  pm_mobile: string
  site_access_notes: string
  build_type: string
  image_url: string
}

export interface GuestSupplier {
  id: string
  supplier_name: string
  supplier_address: string
  supplier_place_id: string
  supplier_email: string
  supplier_phone: string
  supplier_website: string
  account_number: string
  payment_type: 'credit' | 'upfront' | ''
  notes: string
  rep_name: string
  rep_mobile: string
}

export interface GuestFavProduct {
  id: string
  product_id: string
  product_name: string
  manufacturer: string
  sku: string
  description: string
  uom: string
  notes: string
}

export interface GuestSentRFQ {
  id: string
  rfq_id_short: string
  supplier_name: string | null
  supplier_email: string | null
  project_reference: string | null
  status: 'sent' | 'won' | 'declined'
  created_at: string
  item_count?: number
}

export interface GuestProfile {
  builder_name: string
  company_name: string
  abn: string
  company_address: string
  company_address_place_id: string
  office_phone: string
  mobile_phone: string
  email: string
}

const KEYS = {
  jobs: 'bq_guest_jobs_v1',
  suppliers: 'bq_guest_suppliers_v1',
  products: 'bq_guest_products_v1',
  draftIds: 'bq_guest_draft_ids_v1',
  sentRfqs: 'bq_guest_sent_rfqs_v1',
  profile: 'bq_guest_profile_v1',
  syncedFor: 'bq_guest_synced_user_v1',
} as const

const DEFAULT_DEMO_JOBS: GuestJob[] = [
  {
    id: 'guest-demo-job-accoya',
    project_reference: 'Accoya House — Demonstration Job Card',
    project_address: '42 Geographe Bay Rd, Busselton WA 6280',
    project_address_place_id: '',
    project_address_manual: '',
    pm_name: 'Sam Builder',
    pm_mobile: '0400 000 000',
    site_access_notes: 'Side gate access on left. Call 30 mins prior to crane truck delivery.',
    build_type: 'Renovation',
    image_url: '',
  },
]

const DEFAULT_DEMO_SUPPLIERS: GuestSupplier[] = [
  {
    id: 'guest-demo-supplier-sandbox',
    supplier_name: 'BuildQuote Sandbox Timber & Hardware',
    supplier_address: 'Busselton WA 6280',
    supplier_place_id: '',
    supplier_email: '',
    supplier_phone: '',
    supplier_website: 'https://buildquote.com.au',
    account_number: 'DEMO-001',
    payment_type: 'credit',
    notes: 'Sandbox supplier — replace with your own email to preview what suppliers receive, or add your real WA suppliers.',
    rep_name: 'Trade Desk',
    rep_mobile: '',
  },
]

function isBrowser() {
  return typeof window !== 'undefined'
}

export function generateGuestId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function getGuestJobs(): GuestJob[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(KEYS.jobs)
    if (raw === null) {
      localStorage.setItem(KEYS.jobs, JSON.stringify(DEFAULT_DEMO_JOBS))
      return DEFAULT_DEMO_JOBS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return DEFAULT_DEMO_JOBS
  }
}

export function saveGuestJobs(jobs: GuestJob[]): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(KEYS.jobs, JSON.stringify(jobs))
  } catch {}
}

export function getGuestJobById(id: string): GuestJob | null {
  return getGuestJobs().find(j => j.id === id) ?? null
}

export function getGuestSuppliers(): GuestSupplier[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(KEYS.suppliers)
    if (raw === null) {
      localStorage.setItem(KEYS.suppliers, JSON.stringify(DEFAULT_DEMO_SUPPLIERS))
      return DEFAULT_DEMO_SUPPLIERS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return DEFAULT_DEMO_SUPPLIERS
  }
}

export function saveGuestSuppliers(suppliers: GuestSupplier[]): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(KEYS.suppliers, JSON.stringify(suppliers))
  } catch {}
}

export function getGuestSupplierById(id: string): GuestSupplier | null {
  return getGuestSuppliers().find(s => s.id === id) ?? null
}

export function getGuestProducts(): GuestFavProduct[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(KEYS.products)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveGuestProducts(products: GuestFavProduct[]): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(KEYS.products, JSON.stringify(products))
  } catch {}
}

export function getGuestDraftIds(): string[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(KEYS.draftIds)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function trackGuestDraftId(draftId: string): void {
  if (!isBrowser() || !draftId) return
  try {
    const existing = getGuestDraftIds()
    const next = [draftId, ...existing.filter(id => id !== draftId)].slice(0, 30)
    localStorage.setItem(KEYS.draftIds, JSON.stringify(next))
  } catch {}
}

export function untrackGuestDraftId(draftId: string): void {
  if (!isBrowser() || !draftId) return
  try {
    const next = getGuestDraftIds().filter(id => id !== draftId)
    localStorage.setItem(KEYS.draftIds, JSON.stringify(next))
  } catch {}
}

export function getGuestSentRfqs(): GuestSentRFQ[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(KEYS.sentRfqs)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addGuestSentRfq(rfq: GuestSentRFQ): void {
  if (!isBrowser()) return
  try {
    const existing = getGuestSentRfqs()
    const next = [rfq, ...existing.filter(r => r.id !== rfq.id)].slice(0, 50)
    localStorage.setItem(KEYS.sentRfqs, JSON.stringify(next))
  } catch {}
}

export function updateGuestSentRfqStatus(id: string, status: 'sent' | 'won' | 'declined'): void {
  if (!isBrowser()) return
  try {
    const next = getGuestSentRfqs().map(r => (r.id === id ? { ...r, status } : r))
    localStorage.setItem(KEYS.sentRfqs, JSON.stringify(next))
  } catch {}
}

export function getGuestProfile(): GuestProfile {
  const empty: GuestProfile = {
    builder_name: '',
    company_name: '',
    abn: '',
    company_address: '',
    company_address_place_id: '',
    office_phone: '',
    mobile_phone: '',
    email: '',
  }
  if (!isBrowser()) return empty
  try {
    const raw = localStorage.getItem(KEYS.profile)
    const savedProfile = raw ? JSON.parse(raw) : {}
    // Also fold in any builder details already entered on SendScreen
    const rawDetails = localStorage.getItem('bq_builder_details')
    const savedDetails = rawDetails ? JSON.parse(rawDetails) : {}
    return {
      builder_name: savedProfile.builder_name || savedDetails.builderName || '',
      company_name: savedProfile.company_name || savedDetails.company || '',
      abn: savedProfile.abn || savedDetails.abn || '',
      company_address: savedProfile.company_address || '',
      company_address_place_id: savedProfile.company_address_place_id || '',
      office_phone: savedProfile.office_phone || savedDetails.phone || '',
      mobile_phone: savedProfile.mobile_phone || '',
      email: savedProfile.email || savedDetails.email || '',
    }
  } catch {
    return empty
  }
}

export function saveGuestProfile(profile: GuestProfile): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(KEYS.profile, JSON.stringify(profile))
    // Keep SendScreen's bq_builder_details in sync so prefill works immediately
    localStorage.setItem(
      'bq_builder_details',
      JSON.stringify({
        builderName: profile.builder_name,
        company: profile.company_name,
        abn: profile.abn,
        phone: profile.office_phone || profile.mobile_phone,
        email: profile.email,
      })
    )
  } catch {}
}

/**
 * One-time best-effort migration when a guest signs in or creates an account:
 * copies any custom guest jobs, suppliers, favourite products, and profile fields
 * into their Supabase builder account so zero work is lost.
 */
export async function syncGuestWorkspaceToAccount(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  if (!isBrowser() || !userId) return false
  try {
    if (localStorage.getItem(KEYS.syncedFor) === userId) return false

    const customJobs = getGuestJobs().filter(j => !j.id.startsWith('guest-demo-'))
    const customSuppliers = getGuestSuppliers().filter(s => !s.id.startsWith('guest-demo-'))
    const customProducts = getGuestProducts()
    const draftIds = getGuestDraftIds()
    const profile = getGuestProfile()

    let syncedAnything = false

    if (customJobs.length > 0) {
      const { error } = await supabase.from('builder_jobs').insert(
        customJobs.map(({ id: _id, ...rest }) => ({
          ...rest,
          builder_id: userId,
          updated_at: new Date().toISOString(),
        }))
      )
      if (!error) syncedAnything = true
    }

    if (customSuppliers.length > 0) {
      const { error } = await supabase.from('builder_suppliers').insert(
        customSuppliers.map(({ id: _id, ...rest }) => ({
          ...rest,
          payment_type: rest.payment_type || null,
          builder_id: userId,
        }))
      )
      if (!error) syncedAnything = true
    }

    if (customProducts.length > 0) {
      const { error } = await supabase.from('builder_favourite_products').insert(
        customProducts.map(({ id: _id, ...rest }) => ({
          ...rest,
          builder_id: userId,
        }))
      )
      if (!error) syncedAnything = true
    }

    if (draftIds.length > 0) {
      await supabase
        .from('rfq_drafts')
        .update({ builder_id: userId })
        .in('id', draftIds)
        .is('builder_id', null)
    }

    if (profile.builder_name || profile.company_name || profile.abn || profile.office_phone || profile.mobile_phone) {
      const { data: existing } = await supabase
        .from('builders')
        .select('builder_name, company_name, abn, company_address, office_phone, mobile_phone')
        .eq('id', userId)
        .maybeSingle()

      const patch: Record<string, string> = {}
      if (!existing?.builder_name && profile.builder_name) patch.builder_name = profile.builder_name
      if (!existing?.company_name && profile.company_name) patch.company_name = profile.company_name
      if (!existing?.abn && profile.abn) patch.abn = profile.abn
      if (!existing?.company_address && profile.company_address) patch.company_address = profile.company_address
      if (!existing?.office_phone && profile.office_phone) patch.office_phone = profile.office_phone
      if (!existing?.mobile_phone && profile.mobile_phone) patch.mobile_phone = profile.mobile_phone

      if (Object.keys(patch).length > 0) {
        await supabase.from('builders').update(patch).eq('id', userId)
        syncedAnything = true
      }
    }

    localStorage.setItem(KEYS.syncedFor, userId)
    return syncedAnything
  } catch {
    return false
  }
}
