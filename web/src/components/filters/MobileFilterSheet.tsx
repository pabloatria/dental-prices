'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import FilterPanel from '@/components/filters/FilterPanel'

interface MobileFilterSheetProps {
  brands: string[]
  suppliers: { id: string; name: string }[]
  activeFilters: {
    brands: string[]
    suppliers: string[]
    inStock: boolean
    sort: string
  }
  basePath: string
  baseQuery?: string
  categorySlug?: string
}

/**
 * Mobile-only filter drawer. Desktop keeps the existing sticky sidebar.
 * Shows an active-filter count badge so users know filters are applied
 * even when the panel is collapsed.
 */
export default function MobileFilterSheet(props: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false)
  const activeCount =
    (props.activeFilters.brands?.length || 0) +
    (props.activeFilters.suppliers?.length || 0) +
    (props.activeFilters.inStock ? 1 : 0)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Abrir filtros"
        className="lg:hidden h-11 px-4 inline-flex items-center gap-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span>Filtros</span>
        {activeCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold min-w-[20px] h-5 px-1.5">
            {activeCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(340px,90vw)] overflow-y-auto p-0">
        <SheetHeader className="sticky top-0 bg-background border-b border-border px-5 py-4 z-10">
          <SheetTitle className="text-base font-semibold">Filtros</SheetTitle>
        </SheetHeader>
        <div className="p-5">
          <FilterPanel {...props} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
