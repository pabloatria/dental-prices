import { NextRequest } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { apiJson, apiError, buildProductUrl } from '@/lib/api/v1-helpers'

/**
 * GET /api/v1/products/:id
 *
 * Returns full product detail for an agent that has resolved the canonical
 * product ID. Includes name, brand, category, image, description and a deep
 * link to the public product page on dentalprecios.cl.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) return apiError('missing product id', 400)

  const supabase = createPublicClient()

  const { data: product, error } = await supabase
    .from('products')
    .select('id, name, brand, description, image_url, category_id, pack_size')
    .eq('id', id)
    .maybeSingle()

  if (error) return apiError('failed to fetch product', 500, error.message)
  if (!product) return apiError(`product not found: ${id}`, 404)

  let category: { id: string; name: string; slug: string } | null = null
  if (product.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('id', product.category_id)
      .maybeSingle()
    if (cat) category = cat
  }

  return apiJson({
    id: product.id,
    name: product.name,
    brand: product.brand ?? null,
    description: product.description ?? null,
    image_url: product.image_url ?? null,
    pack_size: product.pack_size ?? null,
    category,
    url: buildProductUrl(product.id),
  })
}
