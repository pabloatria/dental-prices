import { NextRequest } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { apiJson, apiError, shapeOffer } from '@/lib/api/v1-helpers'

/**
 * GET /api/v1/products/:id/offers?limit=<n>&in_stock_only=true|false
 *
 * Returns all current offers for a product, sorted by price ascending.
 * Default in-stock only. Cap of 100 offers per response.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) return apiError('missing product id', 400)

  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '20'), 1), 100)
  const inStockOnly = url.searchParams.get('in_stock_only') !== 'false'

  const supabase = createPublicClient()

  const { data, error } = await supabase.rpc('get_latest_prices_for_products', {
    product_ids: [id],
  })
  if (error) return apiError('failed to fetch offers', 500, error.message)

  const rows = ((data ?? []) as any[]).filter(
    (r) => r.supplier_active !== false && r.price > 0 && (!inStockOnly || r.in_stock),
  )
  rows.sort((a, b) => a.price - b.price)

  const offers = rows.slice(0, limit).map(shapeOffer)
  return apiJson({
    product_id: id,
    count: offers.length,
    total_available: rows.length,
    offers,
  })
}
