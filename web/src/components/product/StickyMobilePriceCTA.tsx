'use client'

import { formatCLP } from '@/lib/queries/products'

interface Props {
  lowestPrice: number
  storeCount: number
}

/**
 * Mobile-only sticky bottom bar with best price + "Ver proveedores" anchor
 * to the in-page price table. Desktop users already see the price table in
 * the right column of the hero grid — this only matters for small screens.
 */
export default function StickyMobilePriceCTA({ lowestPrice, storeCount }: Props) {
  if (lowestPrice <= 0 || storeCount <= 0) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-background/95 backdrop-blur-sm border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">Desde</p>
          <p className="text-lg font-bold text-price leading-tight">{formatCLP(lowestPrice)}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            en {storeCount} {storeCount === 1 ? 'tienda' : 'tiendas'}
          </p>
        </div>
        <a
          href="#comparar-precios"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-medium px-5 h-11 shrink-0 hover:bg-primary/90 transition-colors"
        >
          Ver proveedores →
        </a>
      </div>
    </div>
  )
}
