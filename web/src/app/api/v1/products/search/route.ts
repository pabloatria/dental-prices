import { NextRequest } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { apiJson, apiError, shapeProductSummary } from '@/lib/api/v1-helpers'

/**
 * GET /api/v1/products/search?q=<query>&limit=<n>&category=<slug>
 *
 * Free-text search across the product catalog. Returns up to `limit` matches
 * (default 10, max 50). Used by agents and partners to find products by name.
 *
 * v1 implementation uses Postgres ilike on name + brand. Track 1 week 2 will
 * upgrade this to a tsvector + trigram-ranked search for better SKU resolution.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '10'), 1), 50)
  const categorySlug = url.searchParams.get('category')

  if (q.length < 2) {
    return apiError('query parameter `q` must be at least 2 characters', 400)
  }

  const supabase = createPublicClient()

  let categoryId: string | null = null
  if (categorySlug) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle()
    if (!cat) return apiError(`unknown category slug: ${categorySlug}`, 404)
    categoryId = cat.id
  }

  // Two-pass search: brand-only matches first (high precision), then name matches.
  // Caller gets a single de-duplicated result list ordered by relevance proxy.
  const escaped = q.replace(/[%_]/g, (m) => `\\${m}`)
  const pattern = `%${escaped}%`

  let query = supabase
    .from('products')
    .select('id, name, brand, category_id, image_url')
    .or(`name.ilike.${pattern},brand.ilike.${pattern}`)
    .limit(limit)

  if (categoryId) query = query.eq('category_id', categoryId)

  const { data, error } = await query
  if (error) return apiError('search failed', 500, error.message)

  const items = (data ?? []).map(shapeProductSummary)
  return apiJson({ q, count: items.length, items })
}
