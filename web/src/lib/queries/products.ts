import type { Price, ProductWithPrices } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Latest-prices helper that calls the `get_latest_prices_for_products` RPC.
 *
 * Why this exists: PostgREST caps every response at 1000 rows regardless of
 * `.limit()`, so a direct `.from('prices').in('product_id', [...]).order(...)`
 * over a category with >1000 historical price rows silently truncates and
 * leaves most products with zero prices. The RPC does
 * `DISTINCT ON (product_id, supplier_id) ... ORDER BY scraped_at DESC` server
 * side and returns at most one row per (product, supplier) pair.
 *
 * Returns the same Map shape as `aggregateLatestPrices` so callers can pass
 * the result straight to `buildProductsWithPrices`.
 */
export async function fetchLatestPricesForProducts(
  supabase: SupabaseClient,
  productIds: string[]
): Promise<Map<string, Map<string, Price>>> {
  const out = new Map<string, Map<string, Price>>()
  if (productIds.length === 0) return out

  const { data, error } = await supabase.rpc('get_latest_prices_for_products', {
    product_ids: productIds,
  })
  if (error || !data) return out

  for (const row of data as any[]) {
    if (row.supplier_active === false) continue
    const price: Price = {
      id: row.id,
      product_id: row.product_id,
      supplier_id: row.supplier_id,
      price: row.price,
      product_url: row.product_url,
      in_stock: row.in_stock,
      scraped_at: row.scraped_at,
      supplier: {
        id: row.supplier_id,
        name: row.supplier_name,
        website_url: row.supplier_website_url,
        logo_url: row.supplier_logo_url,
      },
    }
    if (!out.has(price.product_id)) out.set(price.product_id, new Map())
    out.get(price.product_id)!.set(price.supplier_id, price)
  }
  return out
}

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
