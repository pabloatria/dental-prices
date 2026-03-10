import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import ProductCard from '@/components/ProductCard'

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!category) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', category.id)
    .order('name')

  const productIds = products?.map(p => p.id) || []
  const { data: prices } = productIds.length > 0
    ? await supabase
        .from('prices')
        .select('*, supplier:suppliers(*)')
        .in('product_id', productIds)
        .order('scraped_at', { ascending: false })
    : { data: [] }

  const latestPrices = new Map<string, Map<string, any>>()
  for (const price of prices || []) {
    if (!latestPrices.has(price.product_id)) {
      latestPrices.set(price.product_id, new Map())
    }
    const pp = latestPrices.get(price.product_id)!
    if (!pp.has(price.supplier_id)) {
      pp.set(price.supplier_id, price)
    }
  }

  const productsWithPrices = products?.map(product => {
    const pp = Array.from(latestPrices.get(product.id)?.values() || [])
    const inStock = pp.filter((p: any) => p.in_stock)
    return {
      ...product,
      prices: pp,
      lowest_price: inStock.length > 0 ? Math.min(...inStock.map((p: any) => p.price)) : 0,
      store_count: pp.length,
    }
  }) || []

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/" className="text-2xl font-bold text-blue-600 shrink-0">DentalPrecios</a>
          <div className="flex-1"><SearchBar /></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{category.name}</h1>
        <div className="space-y-4">
          {productsWithPrices.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {productsWithPrices.length === 0 && (
          <p className="text-center py-16 text-gray-400">No hay productos en esta categor&#237;a a&#250;n</p>
        )}
      </div>
    </main>
  )
}
