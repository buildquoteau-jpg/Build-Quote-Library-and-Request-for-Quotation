'use client'

import { useEffect } from 'react'
import { useShoppingList } from '@/components/library/ShoppingListProvider'

/**
 * Captures an active RFQ draft id from the URL (?draft=) into the shopping-list
 * context when a logged-in builder arrives from /rfq "Browse manufacturer
 * products". Once captured it lives in sessionStorage, so it survives clicking
 * through to a system page and back without threading the param onto every link.
 *
 * Reads window.location directly (in an effect) so it needs no Suspense boundary.
 */
export function DraftContextSync() {
  const { setActiveDraftId } = useShoppingList()

  useEffect(() => {
    try {
      const draft = new URLSearchParams(window.location.search).get('draft')
      if (draft) setActiveDraftId(draft)
    } catch {}
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
