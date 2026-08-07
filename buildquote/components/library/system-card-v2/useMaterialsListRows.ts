'use client'

// Shared between the always-visible materials-list bar (MaterialsListBar)
// and the Stockists "Request a quote from this stockist" action — both
// need the same rows built from the current Choose/Components selection.
// Row-building logic ported from SystemCardUI.tsx's buildSelectedItems.

import type { LibrarySystem } from '@/lib/data/getSystems'
import { useSelection } from './SelectionContext'

export type Row = { name: string; spec: string | null; sku: string | null; uom: string | null }

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

export function useMaterialsListRows(system: LibrarySystem) {
  const { colourName, profileNames, componentIds, clearSelection } = useSelection()

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

  return { colourName, rows, hasSelections, buildShoppingListItems, clearSelection }
}
