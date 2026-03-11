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
    const inStock = pp.filter((p) => p.in_stock)
    return {
      ...product,
      prices: pp,
      lowest_price:
        inStock.length > 0
          ? Math.min(...inStock.map((p) => p.price))
          : 0,
      highest_price:
        pp.length > 0 ? Math.max(...pp.map((p) => p.price)) : 0,
      store_count: pp.length,
    }
  })
}
