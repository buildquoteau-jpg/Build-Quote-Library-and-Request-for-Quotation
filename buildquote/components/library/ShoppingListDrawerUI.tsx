'use client'

import { useState, useEffect, useRef } from 'react'
import { useShoppingList } from '@/components/library/ShoppingListProvider'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'


const thStyle: React.CSSProperties = {
  padding: '7px 8px',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#64748b',
  textAlign: 'center',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '8px 8px',
  verticalAlign: 'middle',
}

const qtyBtnStyle: React.CSSProperties = {
  width: '22px', height: '22px',
  borderRadius: '5px',
  border: '1.5px solid #e5e7eb',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 700,
  color: '#374151',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
}

export function ShoppingListDrawerUI() {
  const { shoppingList, addItems, removeItem, updateQty, updateName, updateUom, clearList,
          activeDraftId, setActiveDraftId, addFlash } = useShoppingList()
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [newItemName,   setNewItemName]   = useState('')
  const [sharing,       setSharing]       = useState(false)
  const [converting,    setConverting]    = useState(false)
  const autoConvertRef = useRef(false)

  // "Items landed here" pulse — the cart bar pops/glows and floats a "+N" up
  // whenever items are added, so the eye is drawn to where they went.
  const [pulsing,   setPulsing]   = useState(false)
  const [floatAdd,  setFloatAdd]  = useState(0)
  useEffect(() => {
    if (addFlash.tick === 0) return
    setPulsing(true)
    setFloatAdd(addFlash.count)
    const t1 = setTimeout(() => setPulsing(false), 900)
    const t2 = setTimeout(() => setFloatAdd(0), 1500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [addFlash.tick])

  // Resume a conversion after the login round-trip: a logged-out user who
  // pressed "Request a Quote" is sent to /login?next=/library?convert=1; on
  // return, if they now have a session and a basket, finish the conversion.
  // Waits for the basket to hydrate from localStorage before firing.
  useEffect(() => {
    if (autoConvertRef.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('convert') !== '1') return
    if (shoppingList.length === 0) return // basket not loaded yet
    autoConvertRef.current = true
    // Strip the flag so a refresh doesn't re-fire.
    params.delete('convert')
    const url = new URL(window.location.href)
    url.search = params.toString()
    window.history.replaceState({}, '', url.toString())
    void convertToRFQ()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shoppingList.length])

  if (shoppingList.length === 0) return null

  // ── Add manual item ────────────────────────────────────────────────────────

  function addManualItem() {
    const name = newItemName.trim()
    if (!name) return
    addItems([{
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name, sku: '', desc: '', uom: 'EA', qty: 1,
    }])
    setNewItemName('')
  }

  // ── Share as PNG image ─────────────────────────────────────────────────────

  async function shareList() {
    if (sharing || shoppingList.length === 0) return
    setSharing(true)
    try {
      // Layout — full table: # | Profile & Specs | SKU | UOM | QTY
      const W = 660, PAD = 26
      const HH = 80   // header band
      const CH = 30   // column-header row
      const FH = 46   // footer band
      const ROW_PAD_Y = 11
      const NAME_LH = 18, DESC_LH = 15, SKU_LH = 14

      // Column x positions
      const xIndex   = PAD                    // # (left)
      const xName    = PAD + 24                // name / specs (left)
      const xSku     = 392                     // SKU column (left)
      const skuMaxW  = 150
      const xUom     = 568                     // UOM (center)
      const xQty     = W - PAD                 // QTY (right)
      const nameMaxW = xSku - xName - 16

      // Measure pass — need a context to wrap text and compute row heights.
      const measureCanvas = document.createElement('canvas')
      const mctx = measureCanvas.getContext('2d')!

      function wrap(text: string, font: string, maxW: number): string[] {
        if (!text) return []
        mctx.font = font
        const words = text.split(/\s+/)
        const lines: string[] = []
        let line = ''
        for (const word of words) {
          const test = line ? `${line} ${word}` : word
          if (mctx.measureText(test).width > maxW && line) {
            lines.push(line)
            line = word
          } else {
            line = test
          }
        }
        if (line) lines.push(line)
        return lines
      }

      const NAME_FONT = '600 14px Arial, Helvetica, sans-serif'
      const DESC_FONT = '12px Arial, Helvetica, sans-serif'
      const SKU_FONT  = '11px "Courier New", monospace'

      const rows = shoppingList.map(item => {
        const nameLines = wrap(item.name, NAME_FONT, nameMaxW)
        const descLines = item.desc ? wrap(item.desc, DESC_FONT, nameMaxW) : []
        const skuLines  = item.sku ? wrap(item.sku, SKU_FONT, skuMaxW) : []
        const leftH = nameLines.length * NAME_LH + descLines.length * DESC_LH
        const skuH  = skuLines.length * SKU_LH
        const contentH = Math.max(leftH, skuH, NAME_LH)
        return { item, nameLines, descLines, skuLines, height: contentH + ROW_PAD_Y * 2 }
      })

      const bodyH = rows.reduce((sum, r) => sum + r.height, 0)
      const H = HH + CH + bodyH + FH

      const canvas = document.createElement('canvas')
      canvas.width = W * 2; canvas.height = H * 2
      const ctx = canvas.getContext('2d')!
      ctx.scale(2, 2)
      ctx.textBaseline = 'alphabetic'

      // White bg
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)

      // Header gradient band
      const g = ctx.createLinearGradient(0, 0, W, 0)
      g.addColorStop(0, '#185D7A'); g.addColorStop(1, '#0f4461')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, HH)

      // BuildQuote wordmark
      ctx.textAlign = 'left'
      ctx.font = 'bold 22px Arial, Helvetica, sans-serif'
      ctx.fillStyle = '#ffffff'; ctx.fillText('Build', PAD, HH / 2)
      const bw = ctx.measureText('Build').width
      ctx.fillStyle = '#f97316'; ctx.fillText('Quote', PAD + bw, HH / 2)

      // Subtitle
      ctx.font = '12px Arial, Helvetica, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillText('Materials List', PAD, HH / 2 + 20)

      // Date
      ctx.font = '11px Arial, Helvetica, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'right'
      ctx.fillText(new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }), W - PAD, HH / 2)
      ctx.textAlign = 'left'

      // Column header row
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, HH, W, CH)
      ctx.font = '700 10px Arial, Helvetica, sans-serif'; ctx.fillStyle = '#64748b'
      const chY = HH + CH / 2 + 4
      ctx.textAlign = 'left'
      ctx.fillText('#', xIndex, chY)
      ctx.fillText('PROFILE & SPECS', xName, chY)
      ctx.fillText('SKU / PART NO', xSku, chY)
      ctx.textAlign = 'center'; ctx.fillText('UOM', xUom, chY)
      ctx.textAlign = 'right';  ctx.fillText('QTY', xQty, chY)
      ctx.textAlign = 'left'

      // Item rows
      let y = HH + CH
      rows.forEach(({ item, nameLines, descLines, skuLines, height }, i) => {
        ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#ffffff'; ctx.fillRect(0, y, W, height)

        // Index
        ctx.font = '12px Arial, Helvetica, sans-serif'; ctx.fillStyle = '#9ca3af'; ctx.textAlign = 'left'
        ctx.fillText(String(i + 1), xIndex, y + ROW_PAD_Y + 12)

        // Name (wrapped) + specs
        let ly = y + ROW_PAD_Y + 12
        ctx.font = NAME_FONT; ctx.fillStyle = '#0f172a'
        for (const line of nameLines) { ctx.fillText(line, xName, ly); ly += NAME_LH }
        if (descLines.length) {
          ctx.font = DESC_FONT; ctx.fillStyle = '#6b7280'
          for (const line of descLines) { ctx.fillText(line, xName, ly); ly += DESC_LH }
        }

        // SKU (wrapped, monospace)
        let sy = y + ROW_PAD_Y + 11
        ctx.font = SKU_FONT; ctx.fillStyle = '#475569'
        if (skuLines.length) {
          for (const line of skuLines) { ctx.fillText(line, xSku, sy); sy += SKU_LH }
        } else {
          ctx.fillStyle = '#cbd5e1'; ctx.fillText('—', xSku, sy)
        }

        // UOM (centered)
        ctx.font = '700 11px Arial, Helvetica, sans-serif'; ctx.fillStyle = '#185D7A'; ctx.textAlign = 'center'
        ctx.fillText(item.uom || 'EA', xUom, y + ROW_PAD_Y + 12)

        // Qty (right)
        ctx.font = 'bold 15px Arial, Helvetica, sans-serif'; ctx.fillStyle = '#0f172a'; ctx.textAlign = 'right'
        ctx.fillText(String(item.qty), xQty, y + ROW_PAD_Y + 13)
        ctx.textAlign = 'left'

        // Divider
        ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.5
        ctx.beginPath(); ctx.moveTo(0, y + height); ctx.lineTo(W, y + height); ctx.stroke()

        y += height
      })

      // Footer
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, y, W, FH)
      ctx.font = '11px Arial, Helvetica, sans-serif'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center'
      ctx.fillText(`buildquote.com.au  ·  ${shoppingList.length} item${shoppingList.length !== 1 ? 's' : ''}`, W / 2, y + FH / 2 + 4)
      ctx.textAlign = 'left'

      await new Promise<void>(resolve => {
        canvas.toBlob(async blob => {
          if (!blob) { resolve(); return }
          const file = new File([blob], 'materials-list.png', { type: 'image/png' })
          try {
            if (navigator.share && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: 'BuildQuote Materials List',
                text: `My materials list — ${shoppingList.length} item${shoppingList.length !== 1 ? 's' : ''}`,
                files: [file],
              })
            } else {
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url
              a.download = `materials-list-${new Date().toISOString().slice(0, 10)}.png`; a.click()
              URL.revokeObjectURL(url)
            }
          } catch { /* user cancelled */ }
          resolve()
        }, 'image/png')
      })
    } finally { setSharing(false) }
  }

  // ── Convert to RFQ ─────────────────────────────────────────────────────────

  function itemsPayload() {
    return shoppingList.map(i => ({
      name: i.name,
      sku: i.sku,
      desc: i.desc,
      uom: i.uom,
      qty: String(i.qty),
    }))
  }

  // Public action: requires a builder login. Logged-out users are sent to
  // /login and bounced back to finish the conversion (basket persists in
  // localStorage). Logged-in users get a fresh draft owned by them.
  async function convertToRFQ() {
    if (converting || shoppingList.length === 0) return
    setConverting(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const builderId = session?.user?.id ?? null

      // Not logged in — go authenticate, then return to auto-resume the convert.
      if (!builderId) {
        const next = encodeURIComponent('/library?convert=1')
        window.location.href = `/login?next=${next}`
        return
      }

      const { draftId } = await fetch('/api/create-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ builderId }),
      }).then(r => r.json())

      await fetch('/api/save-draft-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, items: itemsPayload(), mode: 'replace' }),
      })

      clearList()
      window.location.href = `/rfq?draft=${draftId}`
    } catch {
      setConverting(false)
    }
  }

  // Draft-context action: append the basket to the quote request already in
  // progress (the builder came here via "Browse manufacturer products").
  async function addToActiveDraft() {
    if (converting || !activeDraftId || shoppingList.length === 0) return
    setConverting(true)
    try {
      const res = await fetch('/api/save-draft-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: activeDraftId, items: itemsPayload(), mode: 'append' }),
      })
      if (!res.ok) { setConverting(false); return }

      const draftId = activeDraftId
      clearList()
      setActiveDraftId(null)
      window.location.href = `/rfq?draft=${draftId}`
    } catch {
      setConverting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200 }}>

      {/* Expandable drawer */}
      {drawerOpen && (
        <div style={{
          background: '#ffffff', borderTop: '1px solid #e5e7eb',
          maxHeight: '420px', overflowY: 'auto',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
        }}>
          <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 20px 20px' }}>

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', gap: '10px' }}>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: '15px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  Your materials list · {shoppingList.length} item{shoppingList.length !== 1 ? 's' : ''}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>
                  Edit your items, adjust quantities, keep browsing — when you&rsquo;re ready, share your list.
                </p>
              </div>
              <button
                onClick={clearList}
                style={{ flexShrink: 0, fontSize: '12px', fontWeight: 600, color: '#991b1b', background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: '7px', padding: '5px 12px', cursor: 'pointer' }}
              >
                Clear all
              </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={thStyle}>#</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Profile &amp; Specs</th>
                    <th style={{ ...thStyle, textAlign: 'left', width: '20%' }}>SKU / Part No</th>
                    <th style={{ ...thStyle, width: '72px' }}>UOM</th>
                    <th style={{ ...thStyle, width: '100px' }}>QTY</th>
                    <th style={{ ...thStyle, width: '28px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {shoppingList.map((item, rowIdx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: rowIdx % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ ...tdStyle, color: '#9ca3af', textAlign: 'center', verticalAlign: 'top', paddingTop: '12px' }}>{rowIdx + 1}</td>

                      {/* Profile name + specs stacked */}
                      <td style={{ ...tdStyle, verticalAlign: 'top' }}>
                        <textarea
                          value={item.name}
                          onChange={e => updateName(item.id, e.target.value)}
                          rows={Math.max(1, Math.ceil(item.name.length / 32))}
                          style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600, color: '#0f172a', outline: 'none', padding: '2px 0 1px', borderBottom: '1.5px solid transparent', resize: 'none', lineHeight: 1.4, overflow: 'hidden', display: 'block' }}
                          onFocus={e => { e.currentTarget.style.borderBottomColor = '#185D7A' }}
                          onBlur={e => { e.currentTarget.style.borderBottomColor = 'transparent' }}
                        />
                        {item.desc && (
                          <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginTop: '2px', lineHeight: 1.35 }}>{item.desc}</span>
                        )}
                      </td>

                      <td style={{ ...tdStyle, verticalAlign: 'top', paddingTop: '10px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569', background: '#f1f5f9', padding: '2px 5px', borderRadius: '3px', wordBreak: 'break-all' }}>
                          {item.sku || '—'}
                        </span>
                      </td>

                      <td style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'top', paddingTop: '10px' }}>
                        <input
                          value={item.uom}
                          onChange={e => updateUom(item.id, e.target.value.toUpperCase().slice(0, 6))}
                          style={{ width: '52px', border: '1.5px solid #e5e7eb', borderRadius: '4px', background: '#fff', fontSize: '11px', fontWeight: 700, color: '#6b7280', textAlign: 'center', padding: '3px 4px', outline: 'none' }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#185D7A' }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb' }}
                        />
                      </td>

                      <td style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'top', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
                          <button onClick={() => updateQty(item.id, item.qty - 1)} style={qtyBtnStyle}>−</button>
                          <span style={{ minWidth: '24px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{item.qty}</span>
                          <button onClick={() => updateQty(item.id, item.qty + 1)} style={qtyBtnStyle}>+</button>
                        </div>
                      </td>

                      <td style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'top', paddingTop: '10px' }}>
                        <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#9ca3af', lineHeight: 1, padding: '2px' }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Manual add row */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
              <input
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addManualItem() }}
                placeholder="Add an item manually…"
                style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', color: '#0f172a', outline: 'none', background: '#f8fafc' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#185D7A' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb' }}
              />
              <button
                onClick={addManualItem}
                disabled={!newItemName.trim()}
                style={{
                  flexShrink: 0, fontSize: '13px', fontWeight: 700,
                  color: newItemName.trim() ? '#185D7A' : '#9ca3af',
                  background: newItemName.trim() ? '#f0f9ff' : '#f8fafc',
                  border: `1.5px solid ${newItemName.trim() ? '#bae6fd' : '#e5e7eb'}`,
                  borderRadius: '8px', padding: '8px 14px',
                  cursor: newItemName.trim() ? 'pointer' : 'default',
                }}
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <style>{`
        @keyframes bq-cartpop { 0%{transform:scale(1)} 30%{transform:scale(1.035)} 60%{transform:scale(0.995)} 100%{transform:scale(1)} }
        @keyframes bq-countpop { 0%{transform:scale(1)} 40%{transform:scale(1.5)} 100%{transform:scale(1)} }
        @keyframes bq-floatup { 0%{opacity:0;transform:translate(-50%,4px) scale(0.8)} 20%{opacity:1} 100%{opacity:0;transform:translate(-50%,-34px) scale(1)} }
        @media (prefers-reduced-motion: reduce) {
          .bq-cart-bar, .bq-count-pop, .bq-float-badge { animation: none !important; }
        }
      `}</style>
      <div className="bq-cart-bar" style={{
        position: 'relative',
        background: '#185D7A', color: '#ffffff',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between',
        boxShadow: pulsing
          ? '0 -2px 12px rgba(0,0,0,0.2), 0 0 0 3px rgba(249,115,22,0.9), 0 -6px 30px rgba(249,115,22,0.5)'
          : '0 -2px 12px rgba(0,0,0,0.2)',
        animation: pulsing ? 'bq-cartpop 0.6s ease-out' : 'none',
        transformOrigin: 'center bottom',
        transition: 'box-shadow 0.4s ease',
      }}>
        {/* Item count toggle */}
        <button
          onClick={() => setDrawerOpen(o => !o)}
          aria-label={drawerOpen ? 'Hide your materials list' : 'View and edit your materials list'}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: '10px', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '14px', padding: '7px 11px', flexShrink: 1, minWidth: 0 }}
        >
          {/* Floating "+N" that rises out of the cart when items are added */}
          {floatAdd > 0 && (
            <span className="bq-float-badge" style={{ position: 'absolute', left: '50%', top: '-30px', transform: 'translate(-50%,0)', background: '#f97316', color: '#fff', fontWeight: 800, fontSize: '13px', padding: '3px 9px', borderRadius: '99px', whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', animation: 'bq-floatup 1.5s ease-out forwards' }}>
              +{floatAdd} added
            </span>
          )}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Your materials list</span>
          <span style={{ fontWeight: 600, opacity: 0.75, whiteSpace: 'nowrap' }}>·&nbsp;
            <span className="bq-count-pop" style={{ display: 'inline-block', animation: pulsing ? 'bq-countpop 0.6s ease-out' : 'none' }}>{shoppingList.length}</span>
            &nbsp;item{shoppingList.length !== 1 ? 's' : ''}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '2px', flexShrink: 0, background: 'rgba(255,255,255,0.2)', borderRadius: '6px', padding: '3px 8px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {drawerOpen ? 'Hide' : 'View & edit'}
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d={drawerOpen ? 'M2 8L6 4L10 8' : 'M2 4L6 8L10 4'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Share as image */}
          <button
            onClick={shareList}
            disabled={sharing}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '8px 14px', cursor: sharing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, opacity: sharing ? 0.7 : 1 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            {sharing ? 'Sharing…' : 'Share'}
          </button>

          {/* Primary action — context-aware:
              draft in progress → add to it; otherwise start a new quote request */}
          {activeDraftId ? (
            <button
              onClick={addToActiveDraft}
              disabled={converting}
              style={{ background: '#ffffff', color: '#185D7A', border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: 800, fontSize: '14px', cursor: converting ? 'wait' : 'pointer', letterSpacing: '-0.01em', opacity: converting ? 0.7 : 1, transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}
            >
              {converting
                ? 'Adding…'
                : `Add ${shoppingList.length} item${shoppingList.length !== 1 ? 's' : ''} to quote request →`}
            </button>
          ) : (
            <button
              onClick={convertToRFQ}
              disabled={converting}
              style={{ background: '#ffffff', color: '#185D7A', border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: 800, fontSize: '14px', cursor: converting ? 'wait' : 'pointer', letterSpacing: '-0.01em', opacity: converting ? 0.7 : 1, transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}
            >
              {converting ? 'Creating…' : 'Request a Quote →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
