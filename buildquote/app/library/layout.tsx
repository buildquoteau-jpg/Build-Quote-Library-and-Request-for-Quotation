import { ShoppingListProvider } from '@/components/library/ShoppingListProvider'
import { ShoppingListDrawerUI } from '@/components/library/ShoppingListDrawerUI'

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShoppingListProvider>
      {children}
      <ShoppingListDrawerUI />
    </ShoppingListProvider>
  )
}
