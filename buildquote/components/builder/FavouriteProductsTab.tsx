'use client'

import { useState, useEffect } from 'react'
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

  const filtered = products.filter(p =>
    !search || [p.product_name, p.manufacturer, p.sku, p.description].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary">Favourite Products</h2>
        <div className="flex gap-2 items-center">
          <a href="https://mfp.buildquote.com.au" target="_blank" rel="noopener noreferrer"
            className="border border-navy text-navy font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-navy/5 transition flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Browse Portal
          </a>
          <button onClick={openNew} className="bg-navy text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:opacity-90 transition">
            + Add Product
          </button>
        </div>
      </div>

      {products.length > 4 && (
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search your favourites…"
          className="w-full border border-border rounded-xl px-4 py-3 text-sm mb-5 focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
      )}

      {products.length === 0 && !showForm && (
        <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-10 text-center">
          <p className="text-text-muted font-medium mb-2">No favourite products yet.</p>
          <p className="text-text-faint text-sm">Browse the manufacturer portal and add products you use often.</p>
          <a href="https://mfp.buildquote.com.au" target="_blank" rel="noopener noreferrer"
            className="inline-block mt-4 bg-navy text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition">
            Open Manufacturer Portal
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">Unit of Measure</label>
                    <input value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}
                      placeholder="LM, m², ea…"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">Product ID</label>
                    <input value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                      placeholder="Portal ID (optional)"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
                  </div>
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
