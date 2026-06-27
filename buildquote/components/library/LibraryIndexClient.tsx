'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import type { LibrarySystem } from '@/lib/data/getSystems'
import { SystemCardTileUI } from '@/components/library/SystemCardTileUI'

function slugifyCategory(cat: string): string {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

type Props = {
  initialSystems: LibrarySystem[]
  categories: string[]
}

export function LibraryIndexClient({ initialSystems, categories }: Props) {
  const [query,          setQuery]          = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [results,        setResults]        = useState<LibrarySystem[] | null>(null)
  const [error,          setError]          = useState(false)
  const [isPending,      startTransition]   = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derived display list: null results = use initial data (no active filter)
  const displaySystems = results ?? initialSystems

  // Filter initial data by active category when no search query
  const filtered = query
    ? displaySystems
    : activeCategory === 'All'
      ? displaySystems
      : displaySystems.filter(s => s.category === activeCategory)

  // Group for rendering
  const visibleCategories = activeCategory === 'All'
    ? categories
    : categories.filter(c => c === activeCategory)

  const grouped = filtered.reduce<Record<string, LibrarySystem[]>>((acc, sys) => {
    const cat = sys.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(sys)
    return acc
  }, {})

  // Fetch from API whenever query or category changes
  useEffect(() => {
    // Clear any pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const q   = query.trim()
    const cat = activeCategory === 'All' ? '' : activeCategory

    // No filters active — revert to server-rendered initial data
    if (!q && !cat) {
      setResults(null)
      setError(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (q)   params.set('q', q)
      if (cat) params.set('category', cat)

      startTransition(() => {
        fetch(`/api/library/systems?${params.toString()}`)
          .then(r => r.json())
          .then((data: LibrarySystem[]) => {
            setResults(Array.isArray(data) ? data : [])
            setError(false)
          })
          .catch(() => setError(true))
      })
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, activeCategory])

  const isFiltering = query.trim() !== '' || activeCategory !== 'All'

  return (
    <>
      {/* ── Search + filter bar ──────────────────────────────────────────────── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #d1d9e0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '14px 24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Search input */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px', maxWidth: '380px' }}>
            <svg
              width="15" height="15" viewBox="0 0 20 20" fill="none"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }}
            >
              <circle cx="8.5" cy="8.5" r="5.75" stroke="#185D7A" strokeWidth="1.75"/>
              <path d="M13 13L17 17" stroke="#185D7A" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search products…"
              style={{
                width: '100%', boxSizing: 'border-box',
                paddingLeft: '36px', paddingRight: query ? '32px' : '12px',
                paddingTop: '9px', paddingBottom: '9px',
                fontSize: '14px', color: '#111827',
                border: '1.5px solid #d1d9e0', borderRadius: '10px',
                outline: 'none', background: '#f8fafc',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#185D7A' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#d1d9e0' }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '16px', color: '#9ca3af', padding: '2px', lineHeight: 1,
                }}
              >×</button>
            )}
          </div>

          {/* Category pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {['All', ...categories].map(cat => {
              const active = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    fontSize: '13px', fontWeight: active ? 700 : 500,
                    padding: '6px 13px', borderRadius: '20px', cursor: 'pointer',
                    border: `1.5px solid ${active ? '#185D7A' : '#d1d9e0'}`,
                    background: active ? '#185D7A' : '#ffffff',
                    color: active ? '#ffffff' : '#334155',
                    transition: 'all 0.12s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Loading / error states */}
        {isPending && (
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>Searching…</p>
        )}
        {error && !isPending && (
          <p style={{ fontSize: '14px', color: '#ef4444', marginBottom: '16px' }}>Search failed — showing all products.</p>
        )}

        {/* No results */}
        {!isPending && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: '16px', color: '#374151', fontWeight: 600, marginBottom: '8px' }}>
              No products match {query ? `"${query}"` : 'that filter'}
            </p>
            <button
              onClick={() => { setQuery(''); setActiveCategory('All') }}
              style={{ fontSize: '14px', color: '#185D7A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Flat search results (no category sections) */}
        {isFiltering && !isPending && filtered.length > 0 && (
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              {filtered.map(sys => (
                <SystemCardTileUI key={sys.id} system={sys} />
              ))}
            </div>
          </div>
        )}

        {/* Default grouped view (no active filters) */}
        {!isFiltering && !isPending && (
          visibleCategories.filter(cat => grouped[cat]?.length > 0).map(cat => (
            <section key={cat} id={slugifyCategory(cat)} style={{ marginBottom: '56px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', marginBottom: '4px' }}>
                  Product category
                </div>
                <h2 style={{
                  fontSize: 'clamp(20px, 2.5vw, 28px)',
                  fontWeight: 800,
                  color: '#185D7A',
                  fontFamily: 'var(--font-barlow-condensed), sans-serif',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.15,
                  margin: 0,
                }}>
                  {cat}
                </h2>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}>
                {grouped[cat].map(sys => (
                  <SystemCardTileUI key={sys.id} system={sys} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  )
}
