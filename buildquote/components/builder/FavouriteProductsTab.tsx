'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface FavProduct {
  id: string
  product_id: string
  product_name: string
  manufacturer: string
  sku: string
  description: string
  uom: string
  notes: string
}

const emptyProduct: Omit<FavProduct, 'id'> = {
  product_id: '', product_name: '', manufacturer: '', sku: '', description: '', uom: '', notes: '',
}

export default function FavouriteProductsTab({ builderId }: { builderId: string }) {
  const supabase = createSupabaseBrowserClient()
  const [products, setProducts] = useState<FavProduct[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<FavProduct | null>(null)
  const [form, setForm] = useState(emptyProduct)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const importFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    const { data } = await supabase.from('builder_favourite_products').select('*').eq('builder_id', builderId).order('product_name')
    setProducts((data || []) as FavProduct[])
  }

  function openNew() { setForm(emptyProduct); setEditing(null); setShowForm(true) }
  function openEdit(p: FavProduct) { setForm({ ...p }); setEditing(p); setShowForm(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, builder_id: builderId }
    if (editing) {
      await supabase.from('builder_favourite_products').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('builder_favourite_products').insert(payload)
    }
    await loadProducts()
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this product?')) return
    await supabase.from('builder_favourite_products').delete().eq('id', id)
    setProducts(p => p.filter(x => x.id !== id))
  }

  async function handleImportList(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (importFileRef.current) importFileRef.current.value = ''
    setImporting(true)
    setImportMsg('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || !data.items?.length) throw new Error(data?.error || 'No items found in that file.')
      const rows = (data.items as any[]).map(item => ({
        builder_id: builderId,
        product_id: item.productId || '',
        product_name: item.name || '',
        manufacturer: item.manufacturer || '',
        sku: item.sku || '',
        description: item.desc || '',
        uom: item.uom || '',
        notes: '',
      })).filter(r => r.product_name.trim())
      if (!rows.length) throw new Error('No named products found in that file.')
      const { error } = await supabase.from('builder_favourite_products').insert(rows)
      if (error) throw new Error(error.message)
      await loadProducts()
      setImportMsg(`${rows.length} product${rows.length !== 1 ? 's' : ''} imported.`)
    } catch (err: any) {
      setImportMsg(err?.message || 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  const filtered = products.filter(p =>
    !search || [p.product_name, p.manufacturer, p.sku, p.description].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-xl font-bold text-text-primary">Favourite Products</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <a href="/library"
            className="border border-navy text-navy font-bold text-sm px-3 py-2 rounded-xl hover:bg-navy/5 transition flex items-center gap-1.5">
            Product Library
          </a>
          <label className={`border border-navy/40 text-navy font-bold text-sm px-3 py-2 rounded-xl hover:bg-navy/5 transition flex items-center gap-1.5 cursor-pointer ${importing ? 'opacity-60 pointer-events-none' : ''}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {importing ? 'Importing…' : 'Import list'}
            <input
              ref={importFileRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.csv,.xlsx,.xls,.docx,.doc,.txt"
              onChange={handleImportList}
              disabled={importing}
            />
          </label>
          <button onClick={openNew} className="bg-navy text-white font-bold text-sm px-3 py-2 rounded-xl hover:opacity-90 transition">
            + Add
          </button>
        </div>
      </div>

      {importMsg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-between ${
          importMsg.includes('imported') ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <span>{importMsg}</span>
          <button type="button" onClick={() => setImportMsg('')} className="ml-3 opacity-60 hover:opacity-100 text-base leading-none">✕</button>
        </div>
      )}

      {products.length > 4 && (
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search your favourites…"
          className="w-full border border-border rounded-xl px-4 py-3 text-sm mb-5 focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
      )}

      {products.length === 0 && !showForm && (
        <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-10 text-center">
          <p className="text-text-muted font-medium mb-2">No favourite products yet.</p>
          <p className="text-text-faint text-sm">Browse the product library and add products you use often.</p>
          <a href="/library"
            className="inline-block mt-4 bg-navy text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition">
            Browse Product Library
          </a>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(p => (
          <div key={p.id} className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-navy text-sm leading-tight truncate">{p.product_name || '—'}</p>
                {p.manufacturer && <p className="text-xs text-brand font-semibold mt-0.5">{p.manufacturer}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(p)} className="text-xs text-text-muted hover:text-navy font-semibold">Edit</button>
                <button onClick={() => handleDelete(p.id)} className="text-xs text-text-muted hover:text-error font-semibold">✕</button>
              </div>
            </div>
            {p.sku && <p className="text-xs text-text-muted">SKU: {p.sku}</p>}
            {p.description && <p className="text-xs text-text-secondary line-clamp-2 mt-1">{p.description}</p>}
            {p.uom && <p className="text-xs text-text-faint">Unit: {p.uom}</p>}
            {p.notes && <p className="text-xs text-text-muted italic mt-1 border-t border-border-subtle pt-1">{p.notes}</p>}
          </div>
        ))}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-text-primary mb-5">{editing ? 'Edit Product' : 'Add Favourite Product'}</h3>
              <form onSubmit={handleSave} className="flex flex-col gap-4">

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Product Name</label>
                  <input required value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                    placeholder="e.g. Colorbond® Roofing Sheet"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">Manufacturer</label>
                    <input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                      placeholder="BlueScope"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">SKU</label>
                    <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                      placeholder="SKU-001"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief product description…"
                    rows={2}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Unit of Measure</label>
                  <input value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}
                    placeholder="LM, m², ea, sheet…"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Notes</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Preferred colour, spec note, etc."
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 border border-border text-text-secondary font-semibold text-sm py-3 rounded-xl hover:bg-surface-subtle transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-navy text-white font-bold text-sm py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition">
                    {saving ? 'Saving…' : 'Save Product'}
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
