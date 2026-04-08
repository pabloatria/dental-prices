import AddToCartButton from '@/components/product/AddToCartButton'
import StockAlertButton from '@/components/product/StockAlertButton'
import SupplierLink from '@/components/product/SupplierLink'
import type { Price } from '@/lib/types'
import { formatCLP } from '@/lib/queries/products'
import { Badge } from '@/components/ui/badge'

export default function EnhancedPriceTable({ prices, productId }: { prices: Price[], productId: string }) {
  // Sort: real prices ascending first, then catalog-only (price=0) at the end
  const sorted = [...prices].sort((a, b) => {
    if (a.price === 0 && b.price === 0) return 0
    if (a.price === 0) return 1
    if (b.price === 0) return -1
    return a.price - b.price
  })
  const realPrices = sorted.filter((p) => p.price > 0)
  const lowestPrice = realPrices.length > 0 ? realPrices[0].price : 0

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay precios disponibles para este producto</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile card view */}
      <div className="sm:hidden flex flex-col gap-3">
        {sorted.map((price, i) => {
          const isCatalog = price.price === 0
          const isBest = !isCatalog && i === 0 && price.in_stock
          const savings = !isCatalog ? price.price - lowestPrice : 0
          return (
            <div
              key={price.id}
              className={`rounded-lg border p-3 ${isBest ? 'border-success/30 bg-success/5' : 'border-border'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{price.supplier.name}</p>
                  {isBest && (
                    <Badge className="bg-success/10 text-success border-success/20 text-xs mt-1">
                      Mejor precio
                    </Badge>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {isCatalog ? (
                    <span className="text-sm font-medium text-primary">Consultar</span>
                  ) : (
                    <>
                      <span className={`text-lg font-bold ${isBest ? 'text-price' : 'text-foreground'}`}>
                        {formatCLP(price.price)}
                      </span>
                      {savings > 0 && (
                        <p className="text-xs text-muted-foreground">+{formatCLP(savings)}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs">
                  {isCatalog ? (
                    <span className="text-muted-foreground">—</span>
                  ) : price.in_stock ? (
                    <span className="text-success">Disponible</span>
                  ) : (
                    <span className="text-muted-foreground">Agotado</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {!isCatalog && (
                    <AddToCartButton
                      productId={productId}
                      supplierId={price.supplier_id}
                      price={price.price}
                    />
                  )}
                  {!isCatalog || price.product_url ? (
                    <SupplierLink
                      productUrl={price.product_url}
                      productId={productId}
                      supplierId={price.supplier_id}
                      supplierName={price.supplier.name}
                      price={price.price}
                      source="price_table"
                      className={`inline-flex items-center gap-1 min-h-11 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isCatalog
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : isBest
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card border border-border text-foreground'
                      }`}
                    >
                      {isCatalog ? 'Contactar' : 'Comprar'}
                    </SupplierLink>
                  ) : null}
                </div>
              </div>
              {!isCatalog && !price.in_stock && (
                <div className="mt-2">
                  <StockAlertButton
                    productId={productId}
                    supplierId={price.supplier_id}
                    supplierName={price.supplier.name}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Proveedor
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Precio
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Disponibilidad
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((price, i) => {
            const isCatalog = price.price === 0
            const isBest = !isCatalog && i === 0 && price.in_stock
            const savings = !isCatalog ? price.price - lowestPrice : 0

            return (
              <tr
                key={price.id}
                className={`border-b border-border/50 transition-colors hover:bg-accent/50 ${
                  isBest ? 'bg-success/5' : ''
                }`}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{price.supplier.name}</span>
                    {isBest && (
                      <Badge className="bg-success/10 text-success border-success/20 text-xs">
                        Mejor precio
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  {isCatalog ? (
                    <span className="text-sm font-medium text-primary">Consultar precio</span>
                  ) : (
                    <>
                      <span className={`text-lg font-bold ${isBest ? 'text-price' : 'text-foreground'}`}>
                        {formatCLP(price.price)}
                      </span>
                      {savings > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          +{formatCLP(savings)}
                        </p>
                      )}
                    </>
                  )}
                </td>
                <td className="py-4 px-4 text-center">
                  {isCatalog ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : price.in_stock ? (
                    <span className="inline-flex items-center gap-1 text-sm text-success">
                      <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      Disponible
                    </span>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm text-muted-foreground">Agotado</span>
                      <StockAlertButton
                        productId={productId}
                        supplierId={price.supplier_id}
                        supplierName={price.supplier.name}
                      />
                    </div>
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!isCatalog && (
                      <AddToCartButton
                        productId={productId}
                        supplierId={price.supplier_id}
                        price={price.price}
                      />
                    )}
                    <SupplierLink
                      productUrl={price.product_url}
                      productId={productId}
                      supplierId={price.supplier_id}
                      supplierName={price.supplier.name}
                      price={price.price}
                      source="price_table"
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isCatalog
                          ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                          : isBest
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-card border border-border text-foreground hover:bg-accent'
                      }`}
                    >
                      {isCatalog ? 'Contactar proveedor' : 'Ir a comprar'}
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </SupplierLink>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </>
  )
}
