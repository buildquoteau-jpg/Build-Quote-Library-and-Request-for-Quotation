'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { ShoppingListItem } from '@/components/library/SystemCardUI'

const LIST_KEY = 'bq_shopping_list'

type ShoppingListContextType = {
  shoppingList: ShoppingListItem[]
  addItems: (items: ShoppingListItem[]) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  updateName: (id: string, name: string) => void
  updateUom: (id: string, uom: string) => void
  clearList: () => void
}

const ShoppingListContext = createContext<ShoppingListContextType | null>(null)

export function useShoppingList() {
  const ctx = useContext(ShoppingListContext)
  if (!ctx) throw new Error('useShoppingList must be used inside ShoppingListProvider')
  return ctx
}

export function ShoppingListProvider({ children }: { children: ReactNode }) {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LIST_KEY)
      if (saved) setShoppingList(JSON.parse(saved))
    } catch {}
  }, [])

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(LIST_KEY, JSON.stringify(shoppingList))
    } catch {}
  }, [shoppingList])

  function addItems(items: ShoppingListItem[]) {
    setShoppingList(prev => {
      const updated = [...prev]
      for (const item of items) {
        const existing = updated.find(i => i.name === item.name && i.sku === item.sku)
        if (existing) {
          existing.qty += item.qty
        } else {
          updated.push(item)
        }
      }
      return updated
    })
  }

  function removeItem(id: string) {
    setShoppingList(prev => prev.filter(i => i.id !== id))
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) { removeItem(id); return }
    setShoppingList(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  function updateName(id: string, name: string) {
    setShoppingList(prev => prev.map(i => i.id === id ? { ...i, name } : i))
  }

  function updateUom(id: string, uom: string) {
    setShoppingList(prev => prev.map(i => i.id === id ? { ...i, uom } : i))
  }

  function clearList() {
    setShoppingList([])
  }

  return (
    <ShoppingListContext.Provider value={{
      shoppingList, addItems, removeItem, updateQty, updateName, updateUom, clearList,
    }}>
      {children}
    </ShoppingListContext.Provider>
  )
}
