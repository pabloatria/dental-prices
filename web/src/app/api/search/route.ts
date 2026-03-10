import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  const supabase = await createClient()

  let productQuery = supabase
    .from('products')
    .select('*', { count: 'exact' })

  if (query) {
    productQuery = productQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
  }

  if (category) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', category)
      .single()

    if (cat) {
      productQuery = productQuery.eq('category_id', cat.id)
    }
  }

  const { data: products, count, error } = await productQuery
    .range(offset, offset + limit - 1)
    .order('name')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const productIds = products?.map(p => p.id) || []

  if (productIds.length === 0) {
    return Response.json({ products: [], total: 0, page, pages: 0 })
  }

  const { data: prices } = await supabase
    .from('prices')
    .select('*, supplier:suppliers(*)')
    .in('product_id', productIds)
    .order('scraped_at', { ascending: false })

  // Group prices by product, keep only latest per supplier
  const latestPrices = new Map<string, Map<string, any>>()
  for (const price of prices || []) {
    if (!latestPrices.has(price.product_id)) {
      latestPrices.set(price.product_id, new Map())
    }
    const productPrices = latestPrices.get(price.product_id)!
    if (!productPrices.has(price.supplier_id)) {
      productPrices.set(price.supplier_id, price)
    }
  }

  const productsWithPrices = products?.map(product => {
    const productPrices = Array.from(latestPrices.get(product.id)?.values() || [])
    const inStockPrices = productPrices.filter(p => p.in_stock)
    return {
      ...product,
      prices: productPrices,
      lowest_price: inStockPrices.length > 0 ? Math.min(...inStockPrices.map(p => p.price)) : 0,
      store_count: productPrices.length,
    }
  }) || []

  return Response.json({
    products: productsWithPrices,
    total: count || 0,
    page,
    pages: Math.ceil((count || 0) / limit),
  })
}
