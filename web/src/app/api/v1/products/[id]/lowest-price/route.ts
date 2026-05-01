import { NextRequest } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { apiJson, apiError, shapeOffer } from '@/lib/api/v1-helpers'

/**
 * GET /api/v1/products/:id/lowest-price?in_stock_only=true|false
 *
 * Returns the lowest-priced offer for a product across active suppliers.
 * Default behavior is to filter to in-stock offers. Pass
 * `?in_stock_only=false` to include OOS for completeness.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) return apiError('missing product id', 400)

  const url = new URL(request.url)
  const inStockOnly = url.searchParams.get('in_stock_only') !== 'false'

  const supabase = createPublicClient()

  const { data, error } = await supabase.rpc('get_latest_prices_for_products', {
    product_ids: [id],
  })
  if (error) return apiError('failed to fetch prices', 500, error.message)

  const rows = ((data ?? []) as any[]).filter(
    (r) => r.supplier_active !== false && r.price > 0 && (!inStockOnly || r.in_stock),
  )
  if (rows.length === 0) {
    return apiError('no active offers for this product', 404)
  }

  rows.sort((a, b) => a.price - b.price)
  const lowest = shapeOffer(rows[0])

  return apiJson({
    product_id: id,
    lowest: lowest,
    offer_count: rows.length,
  })
}
