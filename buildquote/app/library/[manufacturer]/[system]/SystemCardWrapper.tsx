'use client'

import { useShoppingList } from '@/components/library/ShoppingListProvider'
import { SystemCardUI } from '@/components/library/SystemCardUI'
import type { LibrarySystem, Stockist } from '@/lib/data/getSystems'

export function SystemCardWrapper({
  system,
  stockists = [],
}: {
  system: LibrarySystem
  stockists?: Stockist[]
}) {
  const { addItems } = useShoppingList()
  return <SystemCardUI system={system} stockists={stockists} onAddToList={addItems} />
}
