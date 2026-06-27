'use client'

import { useState } from 'react'
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
  const { shoppingList, addItems, removeItem, updateQty, updateName, updateUom, clearList } = useShoppingList()
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [newItemName,   setNewItemName]   = useState('')
  const [sharing,       setSharing]       = useState(false)
  const [converting,    setConverting]    = useState(false)

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
      const PAD = 28, IH = 56, HH = 88, FH = 52, W = 560
      const H = HH + shoppingList.length * IH + FH

      const canvas = document.createElement('canvas')
      canvas.width = W * 2; canvas.height = H * 2
      const ctx = canvas.getContext('2d')!
      ctx.scale(2, 2)

      // White bg
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)

      // Header gradient
      const g = ctx.createLinearGradient(0, 0, W, 0)
      g.addColorStop(0, '#185D7A'); g.addColorStop(1, '#0f4461')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, HH)

      // BuildQuote wordmark
      ctx.font = 'bold 22px Arial, Helvetica, sans-serif'
      ctx.fillStyle = '#ffffff'; ctx.fillText('Build', PAD, HH / 2 + 8)
      const bw = ctx.measureText('Build').width
      ctx.fillStyle = '#f97316'; ctx.fillText('Quote', PAD + bw, HH / 2 + 8)

      // Subtitle
      ctx.font = '12px Arial, Helvetica, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillText('Materials List', PAD, HH / 2 + 28)

      // Date
      ctx.font = '11px Arial, Helvetica, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'right'
      ctx.fillText(new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }), W - PAD, HH / 2 + 8)
      ctx.textAlign = 'left'

      // Items
      shoppingList.forEach((item, i) => {
        const y = HH + i * IH
        ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#ffffff'; ctx.fillRect(0, y, W, IH)

        // Name (truncate)
        ctx.font = '600 15px Arial, Helvetica, sans-serif'; ctx.fillStyle = '#0f172a'
        const maxW = W - PAD * 2 - 90
        let name = item.name
        while (name.length > 8 && ctx.measureText(name).width > maxW) name = name.slice(0, -4) + '…'
        ctx.fillText(name, PAD, y + IH / 2 + 6)

        // Qty + UOM
        ctx.font = 'bold 15px Arial, Helvetica, sans-serif'; ctx.fillStyle = '#185D7A'; ctx.textAlign = 'right'
        ctx.fillText(`${item.qty} ${item.uom}`, W - PAD, y + IH / 2 + 6); ctx.textAlign = 'left'

        // Divider
        ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.5
        ctx.beginPath(); ctx.moveTo(PAD, y + IH); ctx.lineTo(W - PAD, y + IH); ctx.stroke()
      })

      // Footer
      const fY = HH + shoppingList.length * IH
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, fY, W, FH)
      ctx.font = '11px Arial, Helvetica, sans-serif'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center'
      ctx.fillText(`buildquote.com.au  ·  ${shoppingList.length} item${shoppingList.length !== 1 ? 's' : ''}`, W / 2, fY + FH / 2 + 4)
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

  async function convertToRFQ() {
    if (converting) return
    setConverting(true)
    try {
      // Check if builder is logged in — pass builderId if so
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const builderId = session?.user?.id ?? null

      const { draftId } = await fetch('/api/create-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ builderId }),
      }).then(r => r.json())

      await fetch('/api/save-draft-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          items: shoppingList.map(i => ({
            name: i.name,
            sku: i.sku,
            desc: i.desc,
            uom: i.uom,
            qty: String(i.qty),
          })),
        }),
      })

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {shoppingList.length} item{shoppingList.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={clearList}
                style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b', background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: '7px', padding: '5px 12px', cursor: 'pointer' }}
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
                    <th style={{ ...thStyle, textAlign: 'left', minWidth: '160px' }}>Profile</th>
                    <th style={{ ...thStyle, textAlign: 'left', width: '22%' }}>Specs</th>
                    <th style={{ ...thStyle, textAlign: 'left', width: '18%' }}>SKU / Part No</th>
                    <th style={{ ...thStyle, width: '70px' }}>UOM</th>
                    <th style={{ ...thStyle, width: '100px' }}>QTY</th>
                    <th style={{ ...thStyle, width: '28px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {shoppingList.map((item, rowIdx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: rowIdx % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ ...tdStyle, color: '#9ca3af', textAlign: 'center' }}>{rowIdx + 1}</td>
                      <td style={{ ...tdStyle, wordBreak: 'break-word', minWidth: '160px' }}>
                        <input
                          value={item.name}
                          onChange={e => updateName(item.id, e.target.value)}
                          style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600, color: '#0f172a', outline: 'none', padding: '2px 0', borderBottom: '1.5px solid transparent', wordBreak: 'break-word' }}
                          onFocus={e => { e.currentTarget.style.borderBottomColor = '#185D7A' }}
                          onBlur={e => { e.currentTarget.style.borderBottomColor = 'transparent' }}
                        />
                      </td>
                      <td style={{ ...tdStyle, color: '#64748b', fontSize: '12px', maxWidth: '180px' }}>
                        <span title={item.desc}>
                          {item.desc && item.desc.length > 50 ? item.desc.slice(0, 48) + '…' : item.desc}
                        </span>
                      </td>
                      <td style={{ ...tdStyle }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569', background: '#f1f5f9', padding: '2px 5px', borderRadius: '3px' }}>
                          {item.sku || '—'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input
                          value={item.uom}
                          onChange={e => updateUom(item.id, e.target.value.toUpperCase().slice(0, 6))}
                          style={{ width: '52px', border: '1.5px solid #e5e7eb', borderRadius: '4px', background: '#fff', fontSize: '11px', fontWeight: 700, color: '#6b7280', textAlign: 'center', padding: '3px 4px', outline: 'none' }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#185D7A' }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb' }}
                        />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
                          <button onClick={() => updateQty(item.id, item.qty - 1)} style={qtyBtnStyle}>−</button>
                          <span style={{ minWidth: '24px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{item.qty}</span>
                          <button onClick={() => updateQty(item.id, item.qty + 1)} style={qtyBtnStyle}>+</button>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
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
      <div style={{
        background: '#185D7A', color: '#ffffff',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.2)',
      }}>
        {/* Item count toggle */}
        <button
          onClick={() => setDrawerOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '14px', padding: 0, flexShrink: 0 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          {shoppingList.length} item{shoppingList.length !== 1 ? 's' : ''}
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d={drawerOpen ? 'M2 8L6 4L10 8' : 'M2 4L6 8L10 4'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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

          {/* Convert to RFQ */}
          <button
            onClick={convertToRFQ}
            disabled={converting}
            style={{ background: '#ffffff', color: '#185D7A', border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: 800, fontSize: '14px', cursor: converting ? 'wait' : 'pointer', letterSpacing: '-0.01em', opacity: converting ? 0.7 : 1, transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}
          >
            {converting ? 'Creating…' : 'Request a Quote →'}
          </button>
        </div>
      </div>
    </div>
  )
}
