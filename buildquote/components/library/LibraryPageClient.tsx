'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import type { LibrarySystem } from '@/lib/data/getSystems'
import { SystemCardTileUI } from '@/components/library/SystemCardTileUI'
import { useShoppingList } from '@/components/library/ShoppingListProvider'

const EXAMPLES = ['fibre cement cladding', 'composite decking', 'window hood', 'waterproofing']

const LOADING_MESSAGES = [
  "Measuring twice, reading once…",
  "It's always three trips to Bunnings. Always.",
  "Counting fixings. There are never enough fixings.",
  "Making sure no one forgot the noggins…",
  "Locating the spec sheet left on the ute…",
  "Squaring it up. Levelling it out. Making good.",
]

function slugifyCategory(cat: string) {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function LibraryPageClient({ initialSystems, categories }: {
  initialSystems: LibrarySystem[]
  categories: string[]
}) {
  const { addItems } = useShoppingList()

  const [query,          setQuery]          = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [results,        setResults]        = useState<LibrarySystem[] | null>(null)
  const [searchError,    setSearchError]    = useState(false)
  const [isPending,      startTransition]   = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [listInput,      setListInput]      = useState('')
  const [listParsing,    setListParsing]    = useState(false)
  const [extracting,     setExtracting]     = useState(false)
  const [listError,      setListError]      = useState('')
  const [loadingMsgIdx,  setLoadingMsgIdx]  = useState(0)
  const [dragOver,       setDragOver]       = useState(false)
  const [speechAvailable, setSpeechAvailable] = useState(false)
  const [listListening,  setListListening]  = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const listBusy = listParsing || extracting

  useEffect(() => {
    setSpeechAvailable(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
  }, [])

  useEffect(() => {
    if (!listBusy) { setLoadingMsgIdx(0); return }
    const id = setInterval(() => setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length), 2600)
    return () => clearInterval(id)
  }, [listBusy])

  // ── Search ────────────────────────────────────────────────────────────────

  const displaySystems = results ?? initialSystems
  const filtered = query
    ? displaySystems
    : activeCategory === 'All' ? displaySystems : displaySystems.filter(s => s.category === activeCategory)

  const grouped = filtered.reduce<Record<string, LibrarySystem[]>>((acc, sys) => {
    const cat = sys.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(sys)
    return acc
  }, {})

  const visibleCategories = activeCategory === 'All' ? categories : categories.filter(c => c === activeCategory)
  const isFiltering = query.trim() !== '' || activeCategory !== 'All'

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim(), cat = activeCategory === 'All' ? '' : activeCategory
    if (!q && !cat) { setResults(null); setSearchError(false); return }
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (cat) params.set('category', cat)
      startTransition(() => {
        fetch(`/api/library/systems?${params}`)
          .then(r => r.json())
          .then((d: LibrarySystem[]) => { setResults(Array.isArray(d) ? d : []); setSearchError(false) })
          .catch(() => setSearchError(true))
      })
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, activeCategory])

  // ── Quick List ────────────────────────────────────────────────────────────

  function addParsed(raw: { qty: number; name: string; uom: string }[]) {
    addItems(raw.map((item, i) => ({
      id: `parsed-${Date.now()}-${i}`, name: item.name, sku: '', desc: '',
      uom: item.uom ?? 'EA', qty: Number(item.qty) || 1,
    })))
    setListInput('')
  }

  async function handleReadList(text: string) {
    if (!text.trim()) return
    setListParsing(true); setListError('')
    try {
      const res = await fetch('/api/library/parse-list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (res.ok && Array.isArray(data.items)) addParsed(data.items)
      else setListError("Couldn't read your list — try one item per line with quantities.")
    } catch { setListError('Something went wrong. Try again.') }
    finally { setListParsing(false) }
  }

  async function handleFileUpload(file: File) {
    if (file.size > 8 * 1024 * 1024) { setListError('Photo too large — max 8 MB.'); return }
    setExtracting(true); setListError('')
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res((r.result as string).split(',')[1])
        r.onerror = rej; r.readAsDataURL(file)
      })
      const resp = await fetch('/api/library/extract-from-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type }),
      })
      const data = await resp.json()
      if (resp.ok && Array.isArray(data.items)) addParsed(data.items)
      else setListError("Couldn't read items from that photo — try a clearer shot or type the list.")
    } catch { setListError('Upload failed. Check your connection.') }
    finally { setExtracting(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  function startListVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    setListError('')
    const r = new SR(); r.lang = 'en-AU'
    r.onresult = (e: any) => {
      const t = e.results[0][0].transcript
      setListInput(prev => prev.trim() ? `${prev.trim()}, ${t}` : t)
    }
    r.onerror = () => setListListening(false)
    r.onend   = () => setListListening(false)
    r.start(); setListListening(true)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(155deg, #0d3347 0%, #185D7A 55%, #1e7399 100%)', padding: '52px 20px 44px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>

          <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15, fontFamily: 'var(--font-barlow-condensed), sans-serif' }}>
            Building Product Library
          </h1>
          <p style={{ margin: '0 0 22px', fontSize: '15px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.55 }}>
            Browse product systems and find local WA suppliers — in seconds.
          </p>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="6" stroke="#94a3b8" strokeWidth="2"/><path d="M13 13l3 3" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <input
              type="search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search or ask a question…"
              style={{ width: '100%', boxSizing: 'border-box', border: 0, borderRadius: '16px', padding: '16px 48px 16px 46px', fontSize: '16px', color: '#0f172a', background: '#fff', outline: 'none', boxShadow: '0 6px 28px rgba(0,0,0,0.22)', fontWeight: 500 }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af', lineHeight: 1, padding: '4px' }}>×</button>
            )}
          </div>

          {/* Example chips */}
          {!query && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', alignItems: 'center', marginBottom: '18px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>Try:</span>
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => setQuery(ex)}
                  style={{ fontSize: '13px', padding: '6px 14px', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: '99px', color: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontWeight: 500 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.24)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)' }}>
                  {ex}
                </button>
              ))}
            </div>
          )}

          {/* Quick List panel */}
          <div
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
            onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
            onDragLeave={e => { e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
            onDrop={e => {
              e.preventDefault(); e.stopPropagation(); setDragOver(false)
              const file = e.dataTransfer.files?.[0]
              if (file?.type.startsWith('image/')) { handleFileUpload(file); return }
              const text = e.dataTransfer.getData('text')
              if (text) { setListInput(prev => prev ? `${prev}\n${text}` : text); setListError('') }
            }}
            style={{ background: dragOver ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.18)', border: dragOver ? '2px dashed rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.18)', borderRadius: '14px', padding: '16px 18px', textAlign: 'left', transition: 'background 0.15s, border 0.15s' }}
          >
            <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>Already know what you need?</p>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>Type, upload or speak your building materials list. BuildQuote will convert it into a clear shopping list or RFQ.</p>

            {listBusy ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <style>{`@keyframes bq-spin{to{transform:rotate(360deg)}}@keyframes bq-fade{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
                <svg width="28" height="28" viewBox="0 0 36 36" fill="none" style={{ animation: 'bq-spin 1.1s linear infinite', display: 'block', margin: '0 auto 10px' }}>
                  <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
                  <path d="M18 3 A15 15 0 0 1 33 18" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: '#fff' }}>Reading your list…</p>
                <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', animation: 'bq-fade 2.6s ease-in-out infinite' }}>{LOADING_MESSAGES[loadingMsgIdx]}</p>
              </div>
            ) : (
              <>
                <textarea
                  value={listInput}
                  onChange={e => { setListInput(e.target.value); setListError('') }}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReadList(listInput) }}
                  onPaste={e => {
                    const imgFile = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))?.getAsFile()
                    if (imgFile) { e.preventDefault(); handleFileUpload(imgFile) }
                  }}
                  placeholder="Paste or type a list — e.g. 25 bags post set, 13 stirrups, 15 lengths 70×35 …"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '10px 13px', fontSize: '14px', color: '#fff', outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
                />
                {listError && (
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#fca5a5', fontWeight: 600 }}>{listError}</p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '8px', padding: '7px 12px', userSelect: 'none' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Upload photo
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }}
                        onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }} />
                    </label>
                    {speechAvailable && (
                      <button onClick={startListVoice}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: listListening ? '#fff' : 'rgba(255,255,255,0.8)', background: listListening ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.1)', border: `1px solid ${listListening ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.22)'}`, borderRadius: '8px', padding: '7px 12px', cursor: 'pointer' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                        {listListening ? 'Listening…' : 'Speak list'}
                      </button>
                    )}
                  </div>
                  <button onClick={() => handleReadList(listInput)} disabled={!listInput.trim()}
                    style={{ fontSize: '13px', fontWeight: 700, background: listInput.trim() ? '#fff' : 'rgba(255,255,255,0.22)', color: listInput.trim() ? '#185D7A' : 'rgba(255,255,255,0.45)', border: 'none', borderRadius: '8px', padding: '8px 18px', cursor: listInput.trim() ? 'pointer' : 'default' }}>
                    Read list →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Category pills — single scrollable row */}
      <div style={{ background: '#fff', borderBottom: '1px solid #d1d9e0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '10px 16px', display: 'flex', gap: '6px', alignItems: 'center', overflowX: 'auto', whiteSpace: 'nowrap' as const }}>
          {['All', ...categories].map(cat => {
            const active = activeCategory === cat
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ flexShrink: 0, fontSize: '12px', fontWeight: active ? 700 : 500, padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', border: `1.5px solid ${active ? '#185D7A' : '#d1d9e0'}`, background: active ? '#185D7A' : '#fff', color: active ? '#fff' : '#334155', transition: 'all 0.12s' }}>
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Product grid */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 16px 80px' }}>
        {isPending && <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px' }}>Searching…</p>}
        {searchError && !isPending && <p style={{ fontSize: '13px', color: '#ef4444', marginBottom: '10px' }}>Search failed — showing all products.</p>}

        {!isPending && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontSize: '15px', color: '#374151', fontWeight: 600, marginBottom: '8px' }}>No products match {query ? `"${query}"` : 'that filter'}</p>
            <button onClick={() => { setQuery(''); setActiveCategory('All') }}
              style={{ fontSize: '13px', color: '#185D7A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Clear filters
            </button>
          </div>
        )}

        {isFiltering && !isPending && filtered.length > 0 && (
          <div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>{filtered.length} product{filtered.length !== 1 ? 's' : ''} found</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {filtered.map(sys => <SystemCardTileUI key={sys.id} system={sys} />)}
            </div>
          </div>
        )}

        {!isFiltering && !isPending && (
          visibleCategories.filter(cat => grouped[cat]?.length > 0).map(cat => (
            <section key={cat} id={slugifyCategory(cat)} style={{ marginBottom: '40px' }}>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', marginBottom: '3px' }}>Product category</div>
                <h2 style={{ fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 800, color: '#185D7A', fontFamily: 'var(--font-barlow-condensed), sans-serif', letterSpacing: '-0.01em', lineHeight: 1.15, margin: 0 }}>{cat}</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                {grouped[cat].map(sys => <SystemCardTileUI key={sys.id} system={sys} />)}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  )
}
