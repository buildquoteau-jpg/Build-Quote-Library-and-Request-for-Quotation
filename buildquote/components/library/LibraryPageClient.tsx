'use client'

import { useState, useEffect, useRef, useMemo, useTransition } from 'react'
import type { LibrarySystem } from '@/lib/data/getSystems'
import { SystemCardTileUI } from '@/components/library/SystemCardTileUI'
import { useShoppingList } from '@/components/library/ShoppingListProvider'
import { useDictation } from '@/lib/useDictation'

type Facet = 'manufacturer' | 'category'

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

type ManufacturerTile = {
  name: string
  logo: string | null
  hero: string | null
  posY: number
  description: string | null
}

// Manufacturer tile — hero image with name overlay on top, then a white strip
// with a short description and a "View products" link. Clicking drills into that
// manufacturer's systems (sets the active facet pill), no navigation.
function ManufacturerTileUI({ mfr, onClick }: { mfr: ManufacturerTile; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', width: '100%', padding: 0, textAlign: 'left',
        background: '#fff', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
        border: hovered ? '1.5px solid #185D7A' : '1px solid #d1d5db',
        boxShadow: hovered ? '0 8px 28px rgba(24,93,122,0.18)' : '0 2px 10px rgba(0,0,0,0.07)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
      }}
    >
      {/* Hero — manufacturer name overlaid on image */}
      <div style={{
        height: '150px', flexShrink: 0, position: 'relative', overflow: 'hidden',
        background: mfr.hero ? undefined : 'linear-gradient(135deg, #185D7A 0%, #0f3d52 100%)',
      }}>
        {mfr.hero && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${mfr.hero})`, backgroundSize: 'cover',
            backgroundPosition: `center ${mfr.posY}%`,
          }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,30,45,0.88) 0%, rgba(15,30,45,0.18) 55%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 14px 12px' }}>
          <h3 style={{
            margin: 0, fontSize: '17px', fontWeight: 800, color: '#fff', lineHeight: 1.15,
            letterSpacing: '-0.01em', textShadow: '0 1px 6px rgba(0,0,0,0.35)',
            fontFamily: 'var(--font-barlow-condensed), sans-serif',
          }}>
            {mfr.name}
          </h3>
        </div>
      </div>

      {/* Content strip — description + View products */}
      <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mfr.description && (
          <p style={{
            margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {mfr.description}
          </p>
        )}
        <span style={{ marginTop: 'auto', fontSize: '13px', fontWeight: 700, color: '#185D7A', display: 'flex', alignItems: 'center', gap: '4px' }}>
          View products
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 2.5L8 6L4.5 9.5" stroke="#185D7A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
    </button>
  )
}

export function LibraryPageClient({ initialSystems, categories }: {
  initialSystems: LibrarySystem[]
  categories: string[]
}) {
  const { addItems } = useShoppingList()

  const [query,          setQuery]          = useState('')
  const [facet,          setFacet]          = useState<Facet>('manufacturer')
  const [activeFacet,    setActiveFacet]    = useState('All')
  const [mfrFilter,      setMfrFilter]      = useState('')
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

  // Live dictation for the search bar and the quick-list textarea
  const searchVoice = useDictation(setQuery)
  const listVoice   = useDictation(setListInput)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const listBusy = listParsing || extracting

  useEffect(() => {
    if (!listBusy) { setLoadingMsgIdx(0); return }
    const id = setInterval(() => setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length), 2600)
    return () => clearInterval(id)
  }, [listBusy])

  // ── Search ────────────────────────────────────────────────────────────────

  // Available facet values — manufacturers derived from the data, categories passed in.
  const manufacturers = useMemo(
    () => Array.from(new Set(initialSystems.map(s => s.manufacturer?.name || 'Other'))).sort(),
    [initialSystems]
  )
  const facetValues = facet === 'manufacturer' ? manufacturers : categories
  const facetOf = (s: LibrarySystem) =>
    facet === 'manufacturer' ? (s.manufacturer?.name || 'Other') : (s.category || 'Other')

  // Compact manufacturer tiles for the default "Browse by Manufacturer · All" view —
  // one tile per manufacturer (image + name + count) instead of every system card.
  const manufacturerTiles = useMemo<ManufacturerTile[]>(() => {
    const map = new Map<string, ManufacturerTile>()
    for (const s of initialSystems) {
      const name = s.manufacturer?.name || 'Other'
      let entry = map.get(name)
      if (!entry) {
        entry = {
          name,
          logo: s.manufacturer?.logo_url ?? null,
          hero: null, posY: 50,
          description: s.manufacturer?.description?.trim() || null,
        }
        map.set(name, entry)
      }
      if (!entry.hero && s.hero_image_url?.trim()) {
        entry.hero = s.hero_image_url.trim()
        entry.posY = s.hero_image_position_y ?? 50
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [initialSystems])

  // Manufacturer-tile view has its own name filter (independent of product search).
  const visibleManufacturerTiles = mfrFilter.trim()
    ? manufacturerTiles.filter(m => m.name.toLowerCase().includes(mfrFilter.trim().toLowerCase()))
    : manufacturerTiles

  // Text search hits the API; facet (manufacturer/category) filtering is applied client-side.
  const displaySystems = results ?? initialSystems
  const filtered = activeFacet === 'All'
    ? displaySystems
    : displaySystems.filter(s => facetOf(s) === activeFacet)

  const grouped = filtered.reduce<Record<string, LibrarySystem[]>>((acc, sys) => {
    const key = facetOf(sys)
    if (!acc[key]) acc[key] = []
    acc[key].push(sys)
    return acc
  }, {})

  const visibleFacets = activeFacet === 'All' ? facetValues : [activeFacet]
  const isFiltering = query.trim() !== '' || activeFacet !== 'All'

  // Switch facet (manufacturer ↔ category) — reset the active pill.
  function changeFacet(next: Facet) {
    setFacet(next)
    setActiveFacet('All')
    setMfrFilter('')
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) { setResults(null); setSearchError(false); return }
    debounceRef.current = setTimeout(() => {
      // Strip conversational prefixes so natural-language queries still hit the DB.
      // e.g. "I'm looking for waterproofing" → "waterproofing"
      const cleanQ = q
        .replace(/^(i'?m?\s+)?(looking for|searching for|trying to find|after)\s+/i, '')
        .replace(/^(i\s+)?(want|need|want some|need some|need a|want a|need an|want an)\s+/i, '')
        .replace(/^(find|show|get)\s+(me\s+)?/i, '')
        .replace(/^(do you have|have you got|can i get|can i have|can you show me)\s+/i, '')
        .replace(/^(some|a|an|the)\s+/i, '')
        .trim()
      startTransition(() => {
        fetch(`/api/library/systems?q=${encodeURIComponent(cleanQ)}`)
          .then(r => r.json())
          .then((d: LibrarySystem[]) => { setResults(Array.isArray(d) ? d : []); setSearchError(false) })
          .catch(() => setSearchError(true))
      })
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // ── Quick List ────────────────────────────────────────────────────────────

  function addParsed(raw: { qty: number; name: string; uom: string; desc?: string }[]) {
    addItems(raw.map((item, i) => ({
      id: `parsed-${Date.now()}-${i}`, name: item.name, sku: '', desc: item.desc ?? '',
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(155deg, #0d3347 0%, #185D7A 55%, #1e7399 100%)', padding: '20px 20px 16px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>

          <h1 style={{ margin: '0 0 4px', fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, fontFamily: 'var(--font-barlow-condensed), sans-serif' }}>
            Building Product Library
          </h1>
          <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.45 }}>
            Browse product systems and find local WA suppliers — in seconds.
          </p>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="6" stroke="#94a3b8" strokeWidth="2"/><path d="M13 13l3 3" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <input
              type="search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search or ask a question…"
              style={{ width: '100%', boxSizing: 'border-box', border: 0, borderRadius: '12px', padding: `11px ${searchVoice.supported ? '76px' : '44px'} 11px 42px`, fontSize: '15px', color: '#0f172a', background: '#fff', outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.18)', fontWeight: 500 }}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" style={{ position: 'absolute', right: searchVoice.supported ? '46px' : '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af', lineHeight: 1, padding: '4px' }}>×</button>
            )}
            {searchVoice.supported && (
              <button
                onClick={() => { searchVoice.toggle(query) }}
                aria-label={searchVoice.listening ? 'Stop dictation' : 'Search by voice'}
                title={searchVoice.listening ? 'Stop dictation' : 'Search by voice'}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', cursor: 'pointer', border: 'none', background: searchVoice.listening ? '#ef4444' : '#eef6fa', color: searchVoice.listening ? '#fff' : '#185D7A', animation: searchVoice.listening ? 'bq-pulse 1.2s ease-in-out infinite' : 'none' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
              </button>
            )}
            <style>{`@keyframes bq-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.5)}50%{box-shadow:0 0 0 5px rgba(239,68,68,0)}}`}</style>
          </div>

          {/* Example chips */}
          {!query && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.55)' }}>Try:</span>
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => setQuery(ex)}
                  style={{ fontSize: '12.5px', padding: '4px 12px', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: '99px', color: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontWeight: 500 }}
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
            style={{ background: dragOver ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.18)', border: dragOver ? '2px dashed rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.18)', borderRadius: '12px', padding: '10px 12px', textAlign: 'left', transition: 'background 0.15s, border 0.15s' }}
          >
            <p style={{ margin: '0 0 7px', fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>Already know what you need? <span style={{ fontWeight: 400, opacity: 0.65 }}>Paste a list, upload a photo or speak it.</span></p>

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
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '10px 13px', fontSize: '14px', color: '#fff', outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
                />
                {listError && (
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#fca5a5', fontWeight: 600 }}>{listError}</p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '8px', padding: '7px 12px', userSelect: 'none' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Upload photo
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }}
                        onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }} />
                    </label>
                    {listVoice.supported && (
                      <button onClick={() => { setListError(''); listVoice.toggle(listInput) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: listVoice.listening ? '#fff' : 'rgba(255,255,255,0.8)', background: listVoice.listening ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)', border: `1px solid ${listVoice.listening ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.22)'}`, borderRadius: '8px', padding: '7px 12px', cursor: 'pointer' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                        {listVoice.listening ? 'Tap to stop' : 'Speak list'}
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

      {/* Browse-by toggle (own line) + facet pills (own line) */}
      <div style={{ background: '#fff', borderBottom: '1px solid #d1d9e0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '14px 16px 12px' }}>

          {/* Row 1 — Manufacturer / Category segmented toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Browse by</span>
            <div style={{ display: 'inline-flex', background: '#f1f5f9', border: '1px solid #d1d9e0', borderRadius: '9px', padding: '3px' }}>
              {(['manufacturer', 'category'] as Facet[]).map(f => {
                const on = facet === f
                return (
                  <button key={f} onClick={() => changeFacet(f)}
                    style={{ fontSize: '13px', fontWeight: on ? 700 : 500, padding: '6px 16px', borderRadius: '7px', cursor: 'pointer', border: 'none', background: on ? '#185D7A' : 'transparent', color: on ? '#fff' : '#475569', transition: 'all 0.12s', textTransform: 'capitalize' }}>
                    {f}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Row 2 — facet value pills, full-width scrollable row */}
          <div style={{ display: 'flex', gap: '7px', alignItems: 'center', overflowX: 'auto', whiteSpace: 'nowrap' as const, paddingBottom: '2px' }}>
            {['All', ...facetValues].map(val => {
              const active = activeFacet === val
              return (
                <button key={val} onClick={() => setActiveFacet(val)}
                  style={{ flexShrink: 0, fontSize: '13px', fontWeight: active ? 700 : 500, padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', border: `1.5px solid ${active ? '#185D7A' : '#d1d9e0'}`, background: active ? '#185D7A' : '#fff', color: active ? '#fff' : '#334155', transition: 'all 0.12s' }}>
                  {val}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 16px 80px' }}>
        {isPending && <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px' }}>Searching…</p>}
        {searchError && !isPending && <p style={{ fontSize: '13px', color: '#ef4444', marginBottom: '10px' }}>Search failed — showing all products.</p>}

        {!isPending && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontSize: '15px', color: '#374151', fontWeight: 600, marginBottom: '8px' }}>No products match {query ? `"${query}"` : 'that filter'}</p>
            <button onClick={() => { setQuery(''); setActiveFacet('All') }}
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

        {/* Default "Browse by Manufacturer · All" — compact manufacturer tiles */}
        {!isFiltering && !isPending && facet === 'manufacturer' && (
          <div>
            {/* Search by manufacturer name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '340px' }}>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }}>
                  <circle cx="8.5" cy="8.5" r="5.75" stroke="#185D7A" strokeWidth="1.75"/>
                  <path d="M13 13L17 17" stroke="#185D7A" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
                <input
                  type="search" value={mfrFilter} onChange={e => setMfrFilter(e.target.value)}
                  placeholder="Search manufacturers…"
                  style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '36px', paddingRight: mfrFilter ? '32px' : '12px', paddingTop: '9px', paddingBottom: '9px', fontSize: '14px', color: '#111827', border: '1.5px solid #d1d9e0', borderRadius: '10px', outline: 'none', background: '#fff', transition: 'border-color 0.15s' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#185D7A' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#d1d9e0' }}
                />
                {mfrFilter && (
                  <button onClick={() => setMfrFilter('')} aria-label="Clear" style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#9ca3af', padding: '2px', lineHeight: 1 }}>×</button>
                )}
              </div>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                {visibleManufacturerTiles.length} manufacturer{visibleManufacturerTiles.length !== 1 ? 's' : ''}
              </span>
            </div>

            {visibleManufacturerTiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p style={{ fontSize: '15px', color: '#374151', fontWeight: 600, marginBottom: '8px' }}>No manufacturers match &ldquo;{mfrFilter}&rdquo;</p>
                <button onClick={() => setMfrFilter('')} style={{ fontSize: '13px', color: '#185D7A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear search</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                {visibleManufacturerTiles.map(mfr => (
                  <ManufacturerTileUI key={mfr.name} mfr={mfr} onClick={() => setActiveFacet(mfr.name)} />
                ))}
              </div>
            )}
          </div>
        )}

        {!isFiltering && !isPending && facet === 'category' && (
          visibleFacets.filter(val => grouped[val]?.length > 0).map(val => (
            <section key={val} id={slugifyCategory(val)} style={{ marginBottom: '40px' }}>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', marginBottom: '3px' }}>Product category</div>
                <h2 style={{ fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 800, color: '#185D7A', fontFamily: 'var(--font-barlow-condensed), sans-serif', letterSpacing: '-0.01em', lineHeight: 1.15, margin: 0 }}>{val}</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                {grouped[val].map(sys => <SystemCardTileUI key={sys.id} system={sys} />)}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  )
}
