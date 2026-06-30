import { ShoppingListProvider } from '@/components/library/ShoppingListProvider'
import { ShoppingListDrawerUI } from '@/components/library/ShoppingListDrawerUI'
import { DraftContextSync } from '@/components/library/DraftContextSync'

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShoppingListProvider>
      <DraftContextSync />
      {children}
      <ShoppingListDrawerUI />
    </ShoppingListProvider>
  )
}
