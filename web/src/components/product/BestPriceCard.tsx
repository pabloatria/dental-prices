import type { Price } from '@/lib/types'
import { formatCLP } from '@/lib/queries/products'
import SupplierLink from '@/components/product/SupplierLink'

export default function BestPriceCard({ prices, productId }: { prices: Price[]; productId: string }) {
  const realPrices = prices.filter((p) => p.price > 0)
  const catalogPrices = prices.filter((p) => p.price === 0)
  const isCatalogOnly = prices.length > 0 && realPrices.length === 0

  // Catalog-only: show contact card
  if (isCatalogOnly) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
          </svg>
          <span className="text-sm font-semibold text-primary uppercase tracking-wide">Contactar proveedor</span>
        </div>

        <p className="text-foreground mb-4">
          Este producto está disponible en Chile. Contacta al proveedor para consultar precios y disponibilidad.
        </p>

        <div className="space-y-2">
          {catalogPrices.map((price) => (
            <SupplierLink
              key={price.id}
              productUrl={price.product_url}
              productId={productId}
              supplierId={price.supplier_id}
              supplierName={price.supplier.name}
              price={0}
              source="best_price_catalog"
              className="flex items-center justify-between gap-3 bg-card border border-border rounded-lg px-4 py-3 hover:bg-accent transition-colors"
            >
              <span className="font-medium text-foreground">{price.supplier.name}</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                Contactar
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </span>
            </SupplierLink>
          ))}
        </div>
      </div>
    )
  }

  // Normal flow: show best price
  const inStockPrices = realPrices.filter((p) => p.in_stock).sort((a, b) => a.price - b.price)
  const bestPrice = inStockPrices[0]

  if (!bestPrice) return null

  const highestPrice = realPrices.length > 0 ? Math.max(...realPrices.map((p) => p.price)) : 0
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

      <SupplierLink
        productUrl={bestPrice.product_url}
        productId={productId}
        supplierId={bestPrice.supplier_id}
        supplierName={bestPrice.supplier.name}
        price={bestPrice.price}
        source="best_price"
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        Ir a comprar
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </SupplierLink>

      {/* Show additional catalog-only suppliers */}
      {catalogPrices.length > 0 && (
        <div className="mt-4 pt-4 border-t border-success/20">
          <p className="text-xs text-muted-foreground mb-2">
            También disponible en {catalogPrices.length} {catalogPrices.length === 1 ? 'proveedor' : 'proveedores'} más (consultar precio)
          </p>
        </div>
      )}
    </div>
  )
}
