'use client'

// Stockists — the closing screen. Re-skinned into System Card V2's visual
// language, but unlike Data Studio's sandbox version (which only ever
// renders a flat placeholder list), this keeps this app's real stockist
// functionality: a live materials-list preview built from the current
// Choose/Components selection, a real "Add to shopping list" action (V2's
// sandbox never had a persisted cart to push to — this app already does),
// postcode-narrowed stockist ordering, and the auth-gated "Request a quote
// from this stockist" flow that seeds an RFQ draft via /api/create-draft +
// /api/save-draft-items. Ported behaviour from SystemCardUI.tsx's
// buildSelectedItems/handleAddToList/requestQuoteFromStockist/StockistRow.

import { useEffect, useState } from 'react'
import type { LibrarySystem, Stockist } from '@/lib/data/getSystems'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useSelection } from './SelectionContext'
import styles from './RevealsBody.module.css'

export type ShoppingListItem = {
  id: string
  name: string
  sku: string
  desc: string
  uom: string
  qty: number
}

function fmtUom(uom: string | null): string {
  if (!uom) return ''
  const map: Record<string, string> = {
    sheet: 'SHEET', roll: 'ROLL', ea: 'EACH', each: 'EACH',
    lm: 'LIN.M', m2: 'M²', kg: 'KG', box: 'BOX', pack: 'PACK', length: 'LENGTH',
  }
  return map[uom.toLowerCase()] ?? uom.toUpperCase()
}

const REGION_LABELS: Record<string, string> = {
  sw_wa: 'South West WA',
  perth: 'Perth',
  wa: 'WA',
}

function normaliseUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type Row = { name: string; spec: string | null; sku: string | null; uom: string | null }

function StockistRow({ stockist, isLoggedIn, hasSelections, servesPostcode, pending, onRequestQuote }: {
  stockist: Stockist
  isLoggedIn: boolean | null
  hasSelections: boolean
  servesPostcode: boolean
  pending: boolean
  onRequestQuote: () => void
}) {
  const locationBits = [stockist.suburb, stockist.state].filter(Boolean).join(', ')
  const regionLabel = stockist.region ? (REGION_LABELS[stockist.region] ?? stockist.region) : null
  const canRequest = hasSelections && !pending

  return (
    <div className={styles.stockistCard}>
      {stockist.google_maps_url && (
        <div className={styles.stockistMapWrap}>
          <iframe
            src={stockist.google_maps_url}
            title={`${stockist.name} location`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className={styles.stockistMapFrame}
          />
        </div>
      )}

      <div className={styles.stockistBody}>
        <div className={styles.stockistHeadRow}>
          <h4 className={styles.stockistName}>{stockist.name}</h4>
          <div className={styles.stockistTagRow}>
            {servesPostcode && <span className={styles.badge} data-tone="success">✓ Services your area</span>}
            {regionLabel && <span className={styles.badge} data-tone="neutral">{regionLabel}</span>}
          </div>
        </div>

        {locationBits && <p className={styles.stockistMetaLine}>{locationBits}</p>}
        {stockist.opening_hours && <p className={styles.stockistMetaLine}>{stockist.opening_hours}</p>}
        {stockist.delivery_info && <p className={styles.stockistMetaLine}>{stockist.delivery_info}</p>}

        {(stockist.phone || stockist.website_url) && (
          <div className={styles.contactChipRow}>
            {stockist.phone && (
              <a href={`tel:${stockist.phone.replace(/\s+/g, '')}`} className={styles.contactChip}>
                {stockist.phone}
              </a>
            )}
            {stockist.website_url && (
              <a href={normaliseUrl(stockist.website_url)} target="_blank" rel="noopener noreferrer" className={styles.contactChip}>
                Website <ExternalIcon />
              </a>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onRequestQuote}
          disabled={!canRequest}
          className={styles.addToListBtn}
          style={{ marginTop: '0.75rem' }}
        >
          {pending
            ? 'Starting…'
            : !hasSelections
              ? 'Select items above to request a quote'
              : isLoggedIn === false
                ? 'Log in to request a quote'
                : 'Request a quote from this stockist'}
        </button>
      </div>
    </div>
  )
}

export function StockistsReveal({ system, stockists, onAddToList }: {
  system: LibrarySystem
  stockists: Stockist[]
  onAddToList?: (items: ShoppingListItem[]) => void
}) {
  const { colourName, profileNames, componentIds, clearSelection } = useSelection()
  const [postcode, setPostcode] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [rfqStockistId, setRfqStockistId] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState(0)

  // Auth gates "Request a quote": only logged-in builders reach the RFQ
  // flow; logged-out visitors are sent to log in first.
  useEffect(() => {
    let active = true
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setIsLoggedIn(!!session?.user?.id)
    })
    return () => { active = false }
  }, [])

  const profileRows: Row[] = system.system_profiles
    .filter(p => profileNames.includes(p.profile_name ?? ''))
    .map(p => ({
      name: p.profile_name ?? p.name ?? 'Profile',
      spec: [p.length_mm && `${p.length_mm}mm`, p.width_mm && `${p.width_mm}mm`, p.thickness_mm && `${p.thickness_mm}mm`].filter(Boolean).join(' × ') || p.dimensions,
      sku: p.product_code,
      uom: p.uom,
    }))

  const componentRows: Row[] = system.system_components
    .filter(c => componentIds.includes(c.id))
    .map(c => ({
      name: c.components?.name ?? 'Component',
      spec: c.components?.description ?? null,
      sku: c.components?.sku ?? null,
      uom: c.components?.uom ?? null,
    }))

  const rows = [...profileRows, ...componentRows]
  const hasSelections = rows.length > 0

  // Shared by "Add to shopping list" and "Request a quote from this stockist".
  function buildShoppingListItems(): ShoppingListItem[] {
    return rows.map((r, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: r.name,
      sku: r.sku ?? '',
      desc: r.spec ?? '',
      uom: fmtUom(r.uom) || 'EA',
      qty: 1,
    }))
  }

  function handleAddToList() {
    if (!onAddToList || rows.length === 0) return
    const items = buildShoppingListItems()
    onAddToList(items)
    setJustAdded(items.length)
    clearSelection()
    window.setTimeout(() => setJustAdded(0), 2000)
  }

  async function requestQuoteFromStockist(stockist: Stockist) {
    if (rfqStockistId) return
    const items = buildShoppingListItems()
    if (items.length === 0) return

    const next = encodeURIComponent(system.manufacturer ? `/library/${system.manufacturer.slug}/${system.slug}` : `/library`)

    if (isLoggedIn === false) {
      window.location.href = `/login?next=${next}`
      return
    }

    setRfqStockistId(stockist.id)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const builderId = session?.user?.id ?? null
      if (!builderId) {
        window.location.href = `/login?next=${next}`
        return
      }

      const { draftId } = await fetch('/api/create-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          builderId,
          supplierName: stockist.name,
          supplierEmail: stockist.email ?? '',
          supplierId: stockist.id,
        }),
      }).then(r => r.json())

      await fetch('/api/save-draft-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          items: items.map(i => ({ name: i.name, sku: i.sku, desc: i.desc, uom: i.uom, qty: String(i.qty) })),
          mode: 'replace',
        }),
      })

      window.location.href = `/rfq?draft=${draftId}`
    } catch {
      setRfqStockistId(null)
    }
  }

  const validPostcode = /^\d{4}$/.test(postcode)
  // Show every stockist; just float the ones servicing the entered postcode
  // to the top (never hide any).
  const ordered = validPostcode
    ? [...stockists].sort((a, b) =>
        Number(b.service_postcodes.includes(postcode)) - Number(a.service_postcodes.includes(postcode)))
    : stockists
  const hasAreaMatch = validPostcode && stockists.some(s => s.service_postcodes.includes(postcode))

  return (
    <>
      <div className={styles.specGroup}>
        <p className={styles.specGroupLabel}>Your materials list</p>
        {colourName && <p className={styles.selectionColourNote}>Colour: {colourName}</p>}

        {rows.length === 0 && justAdded === 0 ? (
          <p className={styles.emptyState}>Select a profile or component to add it here.</p>
        ) : (
          <>
            {rows.length > 0 && (
              <div className={styles.specTableScroll}>
                <table className={styles.specTable}>
                  <thead>
                    <tr><th>#</th><th>Profile &amp; specs</th><th>SKU</th><th>UOM</th><th>Qty</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.name}-${i}`}>
                        <td className={styles.specTableNum}>{i + 1}</td>
                        <td className={styles.specTableName}>
                          {r.name}
                          {r.spec && <span className={styles.specTableSub}>{r.spec}</span>}
                        </td>
                        <td>{r.sku ?? '—'}</td>
                        <td>{r.uom ?? '—'}</td>
                        <td>1</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {onAddToList && (
              <button
                type="button"
                className={styles.addToListBtn}
                onClick={handleAddToList}
                disabled={rows.length === 0}
                data-state={justAdded > 0 ? 'success' : undefined}
              >
                {justAdded > 0 ? (
                  <><CheckIcon /> Added {justAdded} item{justAdded !== 1 ? 's' : ''} — see your list below ↓</>
                ) : (
                  `Add ${rows.length} item${rows.length !== 1 ? 's' : ''} to shopping list`
                )}
              </button>
            )}
          </>
        )}
      </div>

      {stockists.length === 0 ? (
        <p className={styles.emptyState}><PinIcon /> No local stockists listed yet.</p>
      ) : (
        <div className={styles.specGroup}>
          <p className={styles.specGroupLabel}>Local stockists</p>
          <input
            className={styles.postcodeInput}
            value={postcode}
            onChange={e => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="Your postcode (optional) — see who services your area"
          />
          {validPostcode && !hasAreaMatch && (
            <p className={styles.noAreaMatchNote}>
              No stockist currently lists <strong>{postcode}</strong> as a service area.
              Showing all {stockists.length} stockist{stockists.length !== 1 ? 's' : ''} below — it&rsquo;s
              worth calling ahead to check delivery, or request a quote and we&rsquo;ll help source it.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {ordered.map(s => (
              <StockistRow
                key={s.id}
                stockist={s}
                isLoggedIn={isLoggedIn}
                hasSelections={hasSelections}
                servesPostcode={validPostcode && s.service_postcodes.includes(postcode)}
                pending={rfqStockistId === s.id}
                onRequestQuote={() => requestQuoteFromStockist(s)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
