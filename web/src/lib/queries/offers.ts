import { SupabaseClient } from '@supabase/supabase-js'

export interface OfferItem {
  product_id: string
  supplier_id: string
  product_name: string
  brand: string | null
  image_url: string | null
  price: number
  original_price: number
  discount_pct: number
  supplier_name: string
  product_url: string
}

/**
 * Fetch active ofertas via the `get_latest_offers_distinct` RPC.
 *
 * Why an RPC: the previous implementation used
 * `.from('prices').limit(500)` then deduped (product_id, supplier_id) in JS.
 * That capped the input at 500 raw rows BEFORE dedup, so the rendered count
 * never exceeded ~250-380 regardless of how many ofertas the catalog held.
 * The RPC does `DISTINCT ON (product_id, supplier_id) ORDER BY scraped_at
 * DESC` server-side over the full prices table, applies the discount
 * threshold against active suppliers + valid products, and returns ranked
 * results so the only ceiling is `limit`.
 */
export async function fetchActiveOffers(
  supabase: SupabaseClient,
  limit = 1000
): Promise<OfferItem[]> {
  const { data, error } = await supabase.rpc('get_latest_offers_distinct', {
    min_discount_pct: 10,
    max_count: limit,
  })
  if (error || !data) return []
  return (data as any[]).map((row) => ({
    product_id: row.product_id,
    supplier_id: row.supplier_id,
    product_name: row.product_name,
    brand: row.brand ?? null,
    image_url: row.image_url ?? null,
    price: row.price,
    original_price: row.original_price,
    discount_pct: row.discount_pct,
    supplier_name: row.supplier_name,
    product_url: row.product_url ?? '',
  }))
}
