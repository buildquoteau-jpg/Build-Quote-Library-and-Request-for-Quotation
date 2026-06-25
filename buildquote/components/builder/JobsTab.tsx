'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'


const BUILD_TYPES = ['New Home', 'Renovation', 'Extension', 'Swimming Pool', 'Landscape', 'Commercial', 'Other']

interface Job {
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

const empty: Omit<Job, 'id'> = {
  project_reference: '', project_address: '', project_address_place_id: '',
  project_address_manual: '', pm_name: '', pm_mobile: '',
  site_access_notes: '', build_type: '', image_url: '',
}

export default function JobsTab({ builderId, onViewQuotesForJob }: { builderId: string; onViewQuotesForJob?: (projectRef: string) => void }) {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [rfqCounts, setRfqCounts] = useState<Record<string, number>>({})
  const [draftsByJob, setDraftsByJob] = useState<Record<string, string[]>>({})
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Job | null>(null)
  const [form, setForm] = useState(empty)
  const [useManualAddress, setUseManualAddress] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const addressRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)

  useEffect(() => { loadJobs() }, [])

  async function loadJobs() {
    const [{ data: jobRows }, { data: rfqRows }, { data: draftRows }] = await Promise.all([
      supabase.from('builder_jobs').select('*').eq('builder_id', builderId).order('created_at', { ascending: false }),
      supabase.from('rfq_requests').select('project_reference').eq('builder_id', builderId).not('project_reference', 'is', null),
      supabase.from('rfq_drafts').select('id, job_id').eq('builder_id', builderId).eq('status', 'draft').not('job_id', 'is', null),
    ])
    setJobs(jobRows || [])
    const counts: Record<string, number> = {}
    for (const row of rfqRows || []) {
      const key = row.project_reference || ''
      if (key) counts[key] = (counts[key] || 0) + 1
    }
    setRfqCounts(counts)
    const drafts: Record<string, string[]> = {}
    for (const row of draftRows || []) {
      if (!row.job_id) continue
      if (!drafts[row.job_id]) drafts[row.job_id] = []
      drafts[row.job_id].push(row.id)
    }
    setDraftsByJob(drafts)
  }

  useEffect(() => {
    if (!showForm || useManualAddress) return
    const init = () => {
      if (!addressRef.current || !window.google) return
      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressRef.current, {
        componentRestrictions: { country: 'au' },
        fields: ['formatted_address', 'place_id'],
      })
      autocompleteRef.current.addListener('place_changed', () => {
        const p = autocompleteRef.current.getPlace()
        setForm(f => ({ ...f, project_address: p.formatted_address || '', project_address_place_id: p.place_id || '' }))
      })
    }
    if (window.google) { init() }
    else {
      window.initGooglePlaces = init
      if (!document.getElementById('google-maps-script')) {
        const s = document.createElement('script')
        s.id = 'google-maps-script'
        s.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGooglePlaces`
        s.async = true
        document.head.appendChild(s)
      }
    }
  }, [showForm, useManualAddress])

  function openNew() { setForm(empty); setEditing(null); setUseManualAddress(false); setShowForm(true) }
  function openEdit(job: Job) { setForm({ ...job }); setEditing(job); setUseManualAddress(!!job.project_address_manual); setShowForm(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, builder_id: builderId, updated_at: new Date().toISOString() }

    let saveError: any = null
    if (editing) {
      const { error } = await supabase.from('builder_jobs').update(payload).eq('id', editing.id)
      saveError = error
    } else {
      const { error } = await supabase.from('builder_jobs').insert(payload)
      saveError = error
    }

    if (saveError) {
      console.error('Job save error:', saveError)
      alert('Save failed: ' + saveError.message)
      setSaving(false)
      return
    }

    await loadJobs()
    setShowForm(false)
    setSaving(false)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${builderId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('job-images').upload(path, file, { upsert: true })
    if (error) {
      alert('Photo upload failed: ' + error.message)
      setImageUploading(false)
      return
    }
    const { data } = supabase.storage.from('job-images').getPublicUrl(path)
    setForm(f => ({ ...f, image_url: data.publicUrl }))
    setImageUploading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this job?')) return
    await supabase.from('builder_jobs').delete().eq('id', id)
    setJobs(j => j.filter(x => x.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text-primary">Current Jobs</h2>
        <button onClick={openNew} className="bg-navy text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:opacity-90 transition">
          + Add Job
        </button>
      </div>

      {jobs.length === 0 && !showForm && (
        <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-10 text-center">
          <p className="text-text-muted font-medium">No jobs yet. Add your first project.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map(job => (
          <div key={job.id} className="bg-surface border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
            {job.image_url && (
              <img src={job.image_url} alt="Site" className="w-full h-20 object-cover block" />
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-bold text-navy text-base">{job.project_reference || 'No reference'}</p>
                  {job.build_type && <span className="inline-block text-xs bg-brand-subtle text-brand font-semibold px-2 py-0.5 rounded-full mt-1">{job.build_type}</span>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(job)} className="text-xs text-text-muted hover:text-navy font-semibold">Edit</button>
                  <button onClick={() => handleDelete(job.id)} className="text-xs text-text-muted hover:text-error font-semibold">Delete</button>
                </div>
              </div>
              <p className="text-sm text-text-secondary">{job.project_address || job.project_address_manual || '—'}</p>
              {job.pm_name && <p className="text-sm text-text-muted mt-1">PM: {job.pm_name}{job.pm_mobile ? ` · ${job.pm_mobile}` : ''}</p>}
              {job.site_access_notes && <p className="text-xs text-text-muted mt-2 italic">{job.site_access_notes}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {rfqCounts[job.project_reference] > 0 && (
                  <button
                    onClick={() => onViewQuotesForJob?.(job.project_reference)}
                    className="text-xs font-semibold text-navy bg-navy/8 border border-navy/20 px-2.5 py-1 rounded-full hover:bg-navy hover:text-white transition-colors"
                    type="button"
                  >
                    {rfqCounts[job.project_reference]} RFQ{rfqCounts[job.project_reference] !== 1 ? 's' : ''} sent →
                  </button>
                )}
                {draftsByJob[job.id]?.length > 0 && (
                  <a
                    href={
                      draftsByJob[job.id].length === 1
                        ? `/rfq?draft=${draftsByJob[job.id][0]}`
                        : `/dashboard?tab=quotes`
                    }
                    className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full hover:bg-amber-100 transition-colors"
                  >
                    {draftsByJob[job.id].length} draft RFQ{draftsByJob[job.id].length !== 1 ? 's' : ''} →
                  </a>
                )}
                <button
                  onClick={() => router.push(`/rfq?job=${job.id}`)}
                  className="flex-1 text-center text-xs font-semibold text-brand border border-brand/30 rounded-lg py-1.5 hover:bg-brand hover:text-white transition-colors"
                >
                  Start a new Request for Quotation
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-text-primary mb-5">{editing ? 'Edit Job' : 'Add Job'}</h3>
              <form onSubmit={handleSave} className="flex flex-col gap-4">

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Project Reference</label>
                  <input value={form.project_reference} onChange={e => setForm(f => ({ ...f, project_reference: e.target.value }))}
                    placeholder="e.g. Smith Residence 2025"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-text-secondary">Project Address</label>
                    <button type="button" onClick={() => setUseManualAddress(m => !m)}
                      className="text-xs text-navy font-semibold hover:underline">
                      {useManualAddress ? 'Use Google lookup' : 'Enter manually'}
                    </button>
                  </div>
                  {useManualAddress ? (
                    <input value={form.project_address_manual} onChange={e => setForm(f => ({ ...f, project_address_manual: e.target.value }))}
                      placeholder="Lot 42 Smith St, Dunsborough WA 6281"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
                  ) : (
                    <input ref={addressRef} value={form.project_address}
                      onChange={e => { setForm(f => ({ ...f, project_address: e.target.value, project_address_place_id: '' })) }}
                      placeholder="Start typing address…"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Build Type</label>
                  <select value={form.build_type} onChange={e => setForm(f => ({ ...f, build_type: e.target.value }))}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition bg-surface">
                    <option value="">Select type…</option>
                    {BUILD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">Project Manager Name</label>
                    <input value={form.pm_name} onChange={e => setForm(f => ({ ...f, pm_name: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">Project Manager Mobile</label>
                    <input value={form.pm_mobile} onChange={e => setForm(f => ({ ...f, pm_mobile: e.target.value }))}
                      placeholder="0400 000 000"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Site Access Notes</label>
                  <textarea value={form.site_access_notes} onChange={e => setForm(f => ({ ...f, site_access_notes: e.target.value }))}
                    placeholder="Gate code, dog on site, etc."
                    rows={3}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Site Photo</label>
                  <div className="flex items-center gap-3">
                    {form.image_url && (
                      <img src={form.image_url} alt="Site" className="w-16 h-16 rounded-xl object-cover border border-border-subtle flex-shrink-0" />
                    )}
                    <label className="cursor-pointer border border-border text-text-secondary text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-surface-subtle transition">
                      {imageUploading ? 'Uploading…' : form.image_url ? 'Change photo' : 'Upload photo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={imageUploading} />
                    </label>
                    {form.image_url && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                        className="text-xs text-text-muted hover:text-error font-semibold">Remove</button>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 border border-border text-text-secondary font-semibold text-sm py-3 rounded-xl hover:bg-surface-subtle transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving || imageUploading}
                    className="flex-1 bg-navy text-white font-bold text-sm py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition">
                    {saving ? 'Saving…' : 'Save Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
