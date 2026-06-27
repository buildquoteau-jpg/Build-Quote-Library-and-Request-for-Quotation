'use client'

import { useShoppingList } from '@/components/library/ShoppingListProvider'
import { SystemCardUI } from '@/components/library/SystemCardUI'
import type { LibrarySystem } from '@/lib/data/getSystems'

export function SystemCardWrapper({ system }: { system: LibrarySystem }) {
  const { addItems } = useShoppingList()
  return <SystemCardUI system={system} onAddToList={addItems} />
}
