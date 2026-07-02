'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'


interface Supplier {
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

const emptySupplier: Omit<Supplier, 'id'> = {
  supplier_name: '', supplier_address: '', supplier_place_id: '',
  supplier_email: '', supplier_phone: '', supplier_website: '',
  account_number: '', payment_type: '',
  notes: '', rep_name: '', rep_mobile: '',
}

export default function SuppliersTab({ builderId }: { builderId: string }) {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(emptySupplier)
  const [saving, setSaving] = useState(false)
  const [mapResults, setMapResults] = useState<any[]>([])
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const autocompleteContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadSuppliers() }, [])

  async function loadSuppliers() {
    const { data } = await supabase.from('builder_suppliers').select('*').eq('builder_id', builderId).order('supplier_name')
    setSuppliers((data || []) as Supplier[])
    setLoaded(true)
  }

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return

    // Default to Southwest WA (Busselton area)
    const swWA = { lat: -33.65, lng: 115.35 }
    const map = new window.google.maps.Map(mapRef.current, {
      center: swWA,
      zoom: 11,
    })
    mapInstanceRef.current = map

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        map.setCenter(loc)
        new window.google.maps.Marker({
          position: loc, map, title: 'You are here',
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#185D7A', fillOpacity: 1, strokeWeight: 2, strokeColor: '#fff' }
        })
      })
    }

    // Mount autocomplete input once
    if (autocompleteContainerRef.current && !autocompleteContainerRef.current.hasChildNodes()) {
      const input = document.createElement('input')
      input.placeholder = 'Search for a supplier…'
      input.className = 'w-full border border-border-subtle rounded-xl px-4 py-3 text-sm outline-none transition'
      autocompleteContainerRef.current.appendChild(input)

      // pac-container is appended to document.body — ensure it sits above our z-[200] modal
      if (!document.getElementById('pac-zindex-fix')) {
        const style = document.createElement('style')
        style.id = 'pac-zindex-fix'
        style.textContent = '.pac-container { z-index: 9999 !important; }'
        document.head.appendChild(style)
      }

      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: 'au' },
        fields: ['name', 'formatted_address', 'place_id', 'international_phone_number', 'website', 'geometry'],
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place.place_id) return  // user pressed Enter without selecting a suggestion

        try {
          if (place.geometry?.viewport) { map.fitBounds(place.geometry.viewport) }
          else if (place.geometry?.location) { map.setCenter(place.geometry.location); map.setZoom(15) }
          if (place.geometry?.location) {
            new window.google.maps.Marker({ map, position: place.geometry.location.toJSON(), title: place.name })
          }
        } catch (e) { console.error('[BQ] map/marker error', e) }

        prefillFromPlace({
          name: place.name || '',
          formatted_address: place.formatted_address || '',
          place_id: place.place_id || '',
          formatted_phone_number: place.international_phone_number || '',
          website: place.website || '',
        })
      })
    }
  }, [])

  useEffect(() => {
    if (!showMap) return
    const load = () => {
      if (window.google) { initMap() }
      else {
        window.initSupplierMap = initMap
        if (!document.getElementById('google-maps-script')) {
          const s = document.createElement('script')
          s.id = 'google-maps-script'
          s.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&v=weekly&libraries=places,marker&callback=initSupplierMap`
          s.async = true
          document.head.appendChild(s)
        }
      }
    }
    load()
  }, [showMap, initMap])

  function prefillFromPlace(place: any) {
    setForm(f => ({
      ...f,
      supplier_name: place.name || '',
      supplier_address: place.formatted_address || place.vicinity || '',
      supplier_place_id: place.place_id || '',
      supplier_phone: place.formatted_phone_number || '',
      supplier_website: place.website || '',
    }))
    setMapResults([])
    setShowMap(false)
    setShowForm(true)
  }

  function openNew() { setForm(emptySupplier); setEditing(null); setShowForm(true) }
  function openEdit(s: Supplier) { setForm({ ...s }); setEditing(s); setShowForm(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, builder_id: builderId, payment_type: form.payment_type || null }

    let saveError: any = null
    if (editing) {
      const { error } = await supabase.from('builder_suppliers').update(payload).eq('id', editing.id)
      saveError = error
    } else {
      const { error } = await supabase.from('builder_suppliers').insert(payload)
      saveError = error
    }

    if (saveError) {
      alert('Save failed: ' + saveError.message)
      setSaving(false)
      return
    }

    await loadSuppliers()
    setShowForm(false)
    setSaving(false)
  }

  function getLogoUrl(website: string) {
    try {
      const domain = new URL(website).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    } catch {
      return null
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this supplier?')) return
    await supabase.from('builder_suppliers').delete().eq('id', id)
    setSuppliers(s => s.filter(x => x.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary">Preferred Suppliers</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowMap(true)} className="border border-navy text-navy font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-navy/5 transition flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Find on Map
          </button>
          <button onClick={openNew} className="bg-navy text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:opacity-90 transition">
            + Add Manually
          </button>
        </div>
      </div>

      {!loaded && !showForm && !showMap && (
        <div className="text-center py-16 text-text-muted text-sm">Loading your suppliers…</div>
      )}

      {loaded && suppliers.length === 0 && !showForm && !showMap && (
        <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-10 text-center">
          <p className="text-text-muted font-medium">No preferred suppliers yet. Find one on the map or add manually.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {suppliers.map(s => {
          const logoUrl = s.supplier_website ? getLogoUrl(s.supplier_website) : null
          const displayDomain = s.supplier_website
            ? (() => { try { return new URL(s.supplier_website).hostname.replace('www.', '') } catch { return s.supplier_website } })()
            : null
          return (
          <div key={s.id} className="relative bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm overflow-hidden">
            {logoUrl && (
              <img
                src={logoUrl}
                alt=""
                className="absolute right-3 top-3 w-20 h-20 object-contain opacity-[0.12] pointer-events-none select-none"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-bold text-navy text-base">{s.supplier_name}</p>
                {s.payment_type && (
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${s.payment_type === 'credit' ? 'bg-teal/15 text-teal' : 'bg-brand-subtle text-brand'}`}>
                    {s.payment_type === 'credit' ? 'Credit Account' : 'Upfront Payment'}
                  </span>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(s)} className="text-xs text-text-muted hover:text-navy font-semibold">Edit</button>
                <button onClick={() => handleDelete(s.id)} className="text-xs text-text-muted hover:text-error font-semibold">Delete</button>
              </div>
            </div>
            {s.supplier_address && <p className="text-sm text-text-secondary">{s.supplier_address}</p>}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {s.supplier_phone && (
                <a href={`tel:${s.supplier_phone}`} className="text-sm text-text-muted hover:text-navy transition">{s.supplier_phone}</a>
              )}
              {s.supplier_email && <p className="text-sm text-text-muted">{s.supplier_email}</p>}
            </div>
            {displayDomain && (
              <a href={s.supplier_website!} target="_blank" rel="noopener noreferrer"
                className="text-xs text-navy hover:underline mt-0.5 block">{displayDomain}</a>
            )}
            {s.account_number && <p className="text-sm text-text-muted mt-1">Account: {s.account_number}</p>}
            {s.rep_name && <p className="text-sm text-text-muted">Rep: {s.rep_name}{s.rep_mobile ? ` · ${s.rep_mobile}` : ''}</p>}
            {s.notes && <p className="text-xs text-text-muted mt-2 italic">{s.notes}</p>}
            {s.supplier_name?.includes('Sandbox') && (
              <p className="text-xs bg-brand-subtle text-brand rounded-lg px-3 py-2 mt-3 leading-relaxed font-medium">
                <span className="font-bold">This is your demonstration supplier.</span> RFQs sent here arrive in your own inbox — use it to see exactly what your suppliers receive.
              </p>
            )}
            <button
              onClick={() => router.push(`/rfq?supplier=${s.id}`)}
              className="mt-3 w-full text-center text-xs font-semibold text-brand border border-brand/30 rounded-lg py-1.5 hover:bg-brand hover:text-white transition-colors"
            >
              Send RFQ →
            </button>
          </div>
        )})}

      </div>

      {/* Map modal */}
      {showMap && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex flex-col">
          <div className="bg-surface p-4 flex items-center gap-3 shadow-md">
            <div ref={autocompleteContainerRef} className="flex-1" />
            <button onClick={() => { setShowMap(false); setMapResults([]) }} className="text-text-muted hover:text-text-primary font-semibold text-sm px-3 py-2">Close</button>
          </div>

          <p className="text-xs text-text-muted bg-surface px-4 pb-2">Search for a supplier and select from the dropdown — the form will open automatically</p>
          <div ref={mapRef} className="flex-1" />
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-text-primary mb-5">{editing ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <form onSubmit={handleSave} className="flex flex-col gap-4">

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Supplier Name</label>
                  <input required value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))}
                    placeholder="Bowens Busselton"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Address</label>
                  <input value={form.supplier_address} onChange={e => setForm(f => ({ ...f, supplier_address: e.target.value }))}
                    placeholder="123 Main St, Busselton WA"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">RFQ Email Address</label>
                  <input type="email" value={form.supplier_email} onChange={e => setForm(f => ({ ...f, supplier_email: e.target.value }))}
                    placeholder="orders@supplier.com.au"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">Phone</label>
                    <input type="tel" value={form.supplier_phone ?? ''} onChange={e => setForm(f => ({ ...f, supplier_phone: e.target.value }))}
                      placeholder="(08) 9754 0000"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">Account Number</label>
                    <input value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))}
                      placeholder="BLD-12345"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Website</label>
                  <input type="url" value={form.supplier_website ?? ''} onChange={e => setForm(f => ({ ...f, supplier_website: e.target.value }))}
                    placeholder="https://www.supplier.com.au"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Payment Type</label>
                  <div className="flex gap-3">
                    {(['credit', 'upfront'] as const).map(pt => (
                      <button key={pt} type="button"
                        onClick={() => setForm(f => ({ ...f, payment_type: pt }))}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition ${form.payment_type === pt ? 'border-navy bg-navy text-white' : 'border-border text-text-secondary hover:border-navy/50'}`}>
                        {pt === 'credit' ? 'Credit Account' : 'Upfront Payment'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">Rep Name</label>
                    <input value={form.rep_name} onChange={e => setForm(f => ({ ...f, rep_name: e.target.value }))}
                      placeholder="Mike Johnson"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">Rep Mobile</label>
                    <input value={form.rep_mobile} onChange={e => setForm(f => ({ ...f, rep_mobile: e.target.value }))}
                      placeholder="0400 000 000"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Delivery days, lead times, anything useful…"
                    rows={3}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition resize-none" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 border border-border text-text-secondary font-semibold text-sm py-3 rounded-xl hover:bg-surface-subtle transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-navy text-white font-bold text-sm py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition">
                    {saving ? 'Saving…' : 'Save Supplier'}
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
