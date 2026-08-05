'use client'

import { useShoppingList } from '@/components/library/ShoppingListProvider'
import { SystemCardV2Experience } from '@/components/library/system-card-v2/SystemCardV2Experience'
import type { LibrarySystem, Stockist } from '@/lib/data/getSystems'

export function SystemCardWrapper({
  system,
  stockists = [],
  cardUrl,
}: {
  system: LibrarySystem
  stockists?: Stockist[]
  cardUrl?: string
}) {
  const { addItems } = useShoppingList()
  return <SystemCardV2Experience system={system} stockists={stockists} onAddToList={addItems} cardUrl={cardUrl} />
}
