import { createPublicClient } from '@/lib/supabase/public'
import { apiJson, apiError } from '@/lib/api/v1-helpers'

/**
 * GET /api/v1/categories
 *
 * Returns the top-level category list with product counts. Useful for agents
 * that want to scope a search by category.
 */
export async function GET() {
  const supabase = createPublicClient()

  const [{ data: categories, error: catErr }, { data: counts }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug, parent_id')
      .is('parent_id', null)
      .order('name'),
    supabase.rpc('get_category_product_counts'),
  ])

  if (catErr) return apiError('failed to fetch categories', 500, catErr.message)

  const countMap = new Map<string, number>()
  for (const row of (counts ?? []) as any[]) {
    if (row.category_id) countMap.set(row.category_id, Number(row.product_count) || 0)
  }

  const items = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    product_count: countMap.get(c.id) ?? 0,
    url: `https://www.dentalprecios.cl/categorias/${c.slug}`,
  }))

  return apiJson({ items, count: items.length })
}
