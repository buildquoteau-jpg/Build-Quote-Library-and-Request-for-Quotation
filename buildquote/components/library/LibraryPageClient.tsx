'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import type { LibrarySystem } from '@/lib/data/getSystems'
import { SystemCardTileUI } from '@/components/library/SystemCardTileUI'
import { useShoppingList } from '@/components/library/ShoppingListProvider'

// ── Constants ─────────────────────────────────────────────────────────────────

const EXAMPLES = ['fibre cement cladding', 'composite decking', 'window hood', 'waterproofing membrane']

const LOADING_MESSAGES = [
  "Measuring twice, reading once…",
  "It's always three trips to Bunnings. Always.",
  "Counting fixings. There are never enough fixings.",
  "Cross-referencing with the ancient wisdom of the spec sheet…",
  "Making sure no one forgot the noggins…",
  "Estimating with 20% contingency for the stuff you'll forget…",
  "Locating the spec sheet that was definitely left on the ute…",
  "Squaring it up. Levelling it out. Making good.",
]

function slugifyCategory(cat: string): string {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  initialSystems: LibrarySystem[]
  categories: string[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LibraryPageClient({ initialSystems, categories }: Props) {
  const { addItems } = useShoppingList()

  // Search / filter state
  const [query,          setQuery]          = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [results,        setResults]        = useState<LibrarySystem[] | null>(null)
  const [searchError,    setSearchError]    = useState(false)
  const [isPending,      startTransition]   = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Quick List state
  const [listInput,      setListInput]      = useState('')
  const [listParsing,    setListParsing]    = useState(false)
  const [extracting,     setExtracting]     = useState(false)
  const [listError,      setListError]      = useState('')
  const [listErrorHints, setListErrorHints] = useState<string[]>([])
  const [loadingMsgIdx,  setLoadingMsgIdx]  = useState(0)
  const [dragOver,       setDragOver]       = useState(false)

  // Voice state
  const [speechAvailable,  setSpeechAvailable]  = useState(false)
  const [listening,        setListening]         = useState(false)
  const [listListening,    setListListening]     = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const listBusy = listParsing || extracting

  // Detect speech API
  useEffect(() => {
    setSpeechAvailable(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
  }, [])

  // Cycle loading messages
  useEffect(() => {
    if (!listBusy) { setLoadingMsgIdx(0); return }
    const id = setInterval(() => setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length), 2600)
    return () => clearInterval(id)
  }, [listBusy])

  // ── Search / filter ────────────────────────────────────────────────────────

  const displaySystems = results ?? initialSystems
  const filtered = query
    ? displaySystems
    : activeCategory === 'All'
      ? displaySystems
      : displaySystems.filter(s => s.category === activeCategory)

  const visibleCategories = activeCategory === 'All'
    ? categories
    : categories.filter(c => c === activeCategory)

  const grouped = filtered.reduce<Record<string, LibrarySystem[]>>((acc, sys) => {
    const cat = sys.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(sys)
    return acc
  }, {})

  const isFiltering = query.trim() !== '' || activeCategory !== 'All'

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q   = query.trim()
    const cat = activeCategory === 'All' ? '' : activeCategory
    if (!q && !cat) { setResults(null); setSearchError(false); return }
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (q)   params.set('q', q)
      if (cat) params.set('category', cat)
      startTransition(() => {
        fetch(`/api/library/systems?${params.toString()}`)
          .then(r => r.json())
          .then((data: LibrarySystem[]) => { setResults(Array.isArray(data) ? data : []); setSearchError(false) })
          .catch(() => setSearchError(true))
      })
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, activeCategory])

  // ── Quick List helpers ─────────────────────────────────────────────────────

  function addParsedItems(rawItems: { qty: number; name: string; uom: string }[]) {
    const items = rawItems.map((item, i) => ({
      id: `parsed-${Date.now()}-${i}`,
      name: item.name,
      sku: '',
      desc: '',
      uom: item.uom ?? 'EA',
      qty: Number(item.qty) || 1,
    }))
    addItems(items)
    setListInput('')
  }

  async function handleReadList(text: string) {
    if (!text.trim()) return
    setListParsing(true); setListError(''); setListErrorHints([])
    try {
      const res  = await fetch('/api/library/parse-list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (res.ok && Array.isArray(data.items)) {
        addParsedItems(data.items)
      } else {
        setListError("We couldn't read your list.")
        setListErrorHints(['Try one item per line, or separate with commas', 'Include quantities, e.g. "25 bags post set"'])
      }
    } catch {
      setListError('Something went wrong. Check your connection and try again.')
    } finally { setListParsing(false) }
  }

  async function handleFileUpload(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      setListError('Photo is too large — please use one under 8 MB.')
      return
    }
    setExtracting(true); setListError(''); setListErrorHints([])
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res  = await fetch('/api/library/extract-from-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type }),
      })
      const data = await res.json()
      if (res.ok && Array.isArray(data.items)) {
        addParsedItems(data.items)
      } else {
        setListError("We couldn't read items from that photo.")
        setListErrorHints(['Make sure the text is clearly visible and well-lit', 'Try a straight-on shot with no shadows', 'Type or paste the list instead'])
      }
    } catch {
      setListError('Upload failed. Check your connection and try again.')
    } finally {
      setExtracting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Voice: main search bar ─────────────────────────────────────────────────

  function startVoiceSearch() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const r = new SR(); r.lang = 'en-AU'
    r.onresult = (e: any) => setQuery(e.results[0][0].transcript)
    r.onerror  = () => setListening(false)
    r.onend    = () => setListening(false)
    r.start(); setListening(true)
  }

  // ── Voice: list textarea ───────────────────────────────────────────────────

  function startListVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    setListError(''); setListErrorHints([])
    const r = new SR(); r.lang = 'en-AU'
    r.onresult = (e: any) => {
      const t = e.results[0][0].transcript
      setListInput(prev => prev.trim() ? `${prev.trim()}, ${t}` : t)
    }
    r.onerror = () => setListListening(false)
    r.onend   = () => setListListening(false)
    r.start(); setListListening(true)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Hero with embedded search ────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(155deg, #0d3347 0%, #185D7A 55%, #1e7399 100%)',
        padding: 'clamp(28px, 4vw, 48px) 20px clamp(24px, 3vw, 40px)',
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>

          {/* Eyebrow + title */}
          <div style={{ marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
              Build<span style={{ color: '#f97316' }}>Quote</span> — Product Library
            </span>
          </div>
          <h1 style={{
            fontSize: 'clamp(22px, 3.5vw, 38px)', fontWeight: 800, color: '#ffffff',
            letterSpacing: '-0.02em', lineHeight: 1.1,
            marginBottom: '8px',
            fontFamily: 'var(--font-barlow-condensed), sans-serif',
          }}>
            Building Product Library
          </h1>
          <p style={{
            fontSize: 'clamp(13px, 1.5vw, 15px)', color: 'rgba(255,255,255,0.72)',
            lineHeight: 1.55, marginBottom: 'clamp(16px, 2.5vw, 24px)',
          }}>
            Browse product systems, add to your list and convert to an RFQ.
          </p>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="8" cy="8" r="6" stroke="#94a3b8" strokeWidth="2"/>
                <path d="M13 13l3 3" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search products…"
              style={{
                width: '100%', boxSizing: 'border-box',
                border: 0, borderRadius: '14px',
                padding: '15px 52px 15px 46px',
                fontSize: '16px', color: '#0f172a', background: '#ffffff',
                outline: 'none', boxShadow: '0 6px 28px rgba(0,0,0,0.22)',
                fontWeight: 500,
              }}
            />
            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '2px' }}>
              {query && (
                <button onClick={() => setQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#9ca3af', lineHeight: 1, padding: '4px 6px' }}>×</button>
              )}
              {speechAvailable && (
                <button onClick={startVoiceSearch} aria-label={listening ? 'Listening…' : 'Voice search'}
                  style={{ background: listening ? 'rgba(24,93,122,0.12)' : 'none', border: 'none', cursor: 'pointer', padding: '7px', borderRadius: '8px', display: 'flex', alignItems: 'center', color: listening ? '#185D7A' : '#9ca3af' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/>
                    <line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Example chips */}
          {!query && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', flexShrink: 0, alignSelf: 'center' }}>Try:</span>
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => setQuery(ex)}
                  style={{ fontSize: '13px', padding: '5px 13px', background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.26)', borderRadius: '99px', color: 'rgba(255,255,255,0.88)', cursor: 'pointer', fontWeight: 500 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.13)' }}>
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
            style={{
              marginTop: '4px',
              background: dragOver ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.18)',
              border: dragOver ? '2px dashed rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.16)',
              borderRadius: '14px', padding: dragOver ? '15px 17px' : '16px 18px',
              textAlign: 'left', transition: 'background 0.15s, border 0.15s',
            }}
          >
            <p style={{ margin: '0 0 3px', fontSize: '15px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
              Already know what you need?
            </p>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
              Type, upload or speak your building materials list. BuildQuote will convert it into a clear shopping list or RFQ.
            </p>

            {listBusy ? (
              <div style={{ padding: '24px 8px 16px', textAlign: 'center' }}>
                <style>{`@keyframes bq-spin{to{transform:rotate(360deg)}}@keyframes bq-fade{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                  <svg width="32" height="32" viewBox="0 0 36 36" fill="none" style={{ animation: 'bq-spin 1.1s linear infinite' }}>
                    <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
                    <path d="M18 3 A15 15 0 0 1 33 18" stroke="#ffffff" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Reading your list…</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', lineHeight: 1.5, minHeight: '36px', animation: 'bq-fade 2.6s ease-in-out infinite' }}>
                  {LOADING_MESSAGES[loadingMsgIdx]}
                </p>
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
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '10px 13px', fontSize: '14px', color: '#ffffff', outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
                />

                {listError && (
                  <div style={{ marginTop: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 12px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: '#fca5a5' }}>{listError}</p>
                    {listErrorHints.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: '14px' }}>
                        {listErrorHints.map(h => <li key={h} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '2px' }}>{h}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {/* Upload photo */}
                    <label title="Upload a photo of a handwritten list"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '8px', padding: '7px 12px', userSelect: 'none' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                      Upload photo
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }}
                        onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }} />
                    </label>

                    {/* Speak list */}
                    {speechAvailable && (
                      <button onClick={startListVoice} title="Speak your list"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: listListening ? '#ffffff' : 'rgba(255,255,255,0.8)', background: listListening ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.1)', border: `1px solid ${listListening ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.22)'}`, borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/>
                          <line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
                        </svg>
                        {listListening ? 'Listening…' : 'Speak list'}
                      </button>
                    )}
                  </div>

                  {/* Read list */}
                  <button onClick={() => handleReadList(listInput)} disabled={!listInput.trim()}
                    style={{ flexShrink: 0, fontSize: '13px', fontWeight: 700, background: listInput.trim() ? '#ffffff' : 'rgba(255,255,255,0.22)', color: listInput.trim() ? '#185D7A' : 'rgba(255,255,255,0.45)', border: 'none', borderRadius: '8px', padding: '8px 18px', cursor: listInput.trim() ? 'pointer' : 'default', transition: 'background 0.15s' }}>
                    Read list →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Category pills ───────────────────────────────────────────────────── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #d1d9e0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '12px 20px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {['All', ...categories].map(cat => {
            const active = activeCategory === cat
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ fontSize: '13px', fontWeight: active ? 700 : 500, padding: '6px 13px', borderRadius: '20px', cursor: 'pointer', border: `1.5px solid ${active ? '#185D7A' : '#d1d9e0'}`, background: active ? '#185D7A' : '#ffffff', color: active ? '#ffffff' : '#334155', transition: 'all 0.12s', whiteSpace: 'nowrap' }}>
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Product grid ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(20px, 3vw, 36px) 20px 80px' }}>

        {isPending && <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '12px' }}>Searching…</p>}
        {searchError && !isPending && <p style={{ fontSize: '14px', color: '#ef4444', marginBottom: '12px' }}>Search failed — showing all products.</p>}

        {!isPending && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: '16px', color: '#374151', fontWeight: 600, marginBottom: '8px' }}>
              No products match {query ? `"${query}"` : 'that filter'}
            </p>
            <button onClick={() => { setQuery(''); setActiveCategory('All') }}
              style={{ fontSize: '14px', color: '#185D7A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Clear filters
            </button>
          </div>
        )}

        {/* Filtered / search results — flat list */}
        {isFiltering && !isPending && filtered.length > 0 && (
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filtered.map(sys => <SystemCardTileUI key={sys.id} system={sys} />)}
            </div>
          </div>
        )}

        {/* Default grouped view */}
        {!isFiltering && !isPending && (
          visibleCategories.filter(cat => grouped[cat]?.length > 0).map(cat => (
            <section key={cat} id={slugifyCategory(cat)} style={{ marginBottom: '48px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', marginBottom: '4px' }}>
                  Product category
                </div>
                <h2 style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: 800, color: '#185D7A', fontFamily: 'var(--font-barlow-condensed), sans-serif', letterSpacing: '-0.01em', lineHeight: 1.15, margin: 0 }}>
                  {cat}
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {grouped[cat].map(sys => <SystemCardTileUI key={sys.id} system={sys} />)}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  )
}
