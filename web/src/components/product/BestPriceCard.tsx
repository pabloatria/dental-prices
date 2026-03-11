import type { Price } from '@/lib/types'
import { formatCLP } from '@/lib/queries/products'

export default function BestPriceCard({ prices }: { prices: Price[] }) {
  const inStockPrices = prices.filter((p) => p.in_stock).sort((a, b) => a.price - b.price)
  const bestPrice = inStockPrices[0]

  if (!bestPrice) return null

  const allPricesSorted = [...prices].sort((a, b) => a.price - b.price)
  const highestPrice = allPricesSorted[allPricesSorted.length - 1]?.price || 0
  const savingsAmount = highestPrice - bestPrice.price
  const savingsPercent = highestPrice > 0 ? Math.round((savingsAmount / highestPrice) * 100) : 0

  return (
    <div className="bg-gradient-to-br from-success/5 to-success/10 border border-success/20 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-semibold text-success uppercase tracking-wide">Mejor precio disponible</span>
      </div>

      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-3xl font-bold text-price">{formatCLP(bestPrice.price)}</span>
        {savingsAmount > 0 && (
          <span className="text-sm text-success font-medium">
            Ahorras {formatCLP(savingsAmount)} ({savingsPercent}%)
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        en <span className="font-medium text-foreground">{bestPrice.supplier.name}</span>
        {bestPrice.in_stock && ' · En stock'}
      </p>

      <a
        href={bestPrice.product_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        Ir a comprar
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </a>
    </div>
  )
}
