import type { Price, ProductWithPrices } from '@/lib/types'

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function aggregateLatestPrices(
  prices: Price[]
): Map<string, Map<string, Price>> {
  const latestPrices = new Map<string, Map<string, Price>>()
  for (const price of prices || []) {
    if (!latestPrices.has(price.product_id)) {
      latestPrices.set(price.product_id, new Map())
    }
    const productPrices = latestPrices.get(price.product_id)!
    if (!productPrices.has(price.supplier_id)) {
      productPrices.set(price.supplier_id, price)
    }
  }
  return latestPrices
}

export function buildProductsWithPrices(
  products: any[],
  latestPrices: Map<string, Map<string, Price>>
): ProductWithPrices[] {
  return products.map((product) => {
    const pp = Array.from(latestPrices.get(product.id)?.values() || [])
    const realPrices = pp.filter((p) => p.price > 0)
    const inStockReal = realPrices.filter((p) => p.in_stock)
    const catalogOnly = pp.length > 0 && realPrices.length === 0
    return {
      ...product,
      prices: pp,
      lowest_price:
        inStockReal.length > 0
          ? Math.min(...inStockReal.map((p) => p.price))
          : realPrices.length > 0
            ? Math.min(...realPrices.map((p) => p.price))
            : 0,
      highest_price:
        realPrices.length > 0 ? Math.max(...realPrices.map((p) => p.price)) : 0,
      store_count: pp.length,
      catalog_only: catalogOnly,
    }
  })
}
