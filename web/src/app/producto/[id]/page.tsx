import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCLP, aggregateLatestPrices, buildProductsWithPrices } from '@/lib/queries/products'
import ProductImage from '@/components/ProductImage'
import PriceChart from '@/components/PriceChart'
import EnhancedPriceTable from '@/components/product/EnhancedPriceTable'
import BestPriceCard from '@/components/product/BestPriceCard'
import SavingsIndicator from '@/components/product/SavingsIndicator'
import FavoriteButton from '@/components/product/FavoriteButton'
import PriceAlertButton from '@/components/product/PriceAlertButton'
import SimilarProducts from '@/components/product/SimilarProducts'
import { Badge } from '@/components/ui/badge'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (!product) notFound()

  // Get category info
  let category = null
  if (product.category_id) {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('id', product.category_id)
      .single()
    category = data
  }

  // Get all prices with supplier info
  const { data: allPrices } = await supabase
    .from('prices')
    .select('*, supplier:suppliers(*)')
    .eq('product_id', id)
    .order('scraped_at', { ascending: false })

  // Latest price per supplier
  const latestBySupplier = new Map()
  for (const price of allPrices || []) {
    if (!latestBySupplier.has(price.supplier_id)) {
      latestBySupplier.set(price.supplier_id, price)
    }
  }
  const currentPrices = Array.from(latestBySupplier.values())
  const inStockPrices = currentPrices.filter((p) => p.in_stock)
  const lowestPrice = inStockPrices.length > 0 ? Math.min(...inStockPrices.map((p: any) => p.price)) : 0
  const highestPrice = currentPrices.length > 0 ? Math.max(...currentPrices.map((p: any) => p.price)) : 0

  // Price history (last 30 days, lowest price per day)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const priceHistory = (allPrices || [])
    .filter((p) => new Date(p.scraped_at) >= thirtyDaysAgo)
    .reduce((acc: { date: string; price: number; supplier: string }[], p) => {
      const date = new Date(p.scraped_at).toISOString().split('T')[0]
      const existing = acc.find((a) => a.date === date)
      if (!existing || p.price < existing.price) {
        const filtered = acc.filter((a) => a.date !== date)
        filtered.push({ date, price: p.price, supplier: p.supplier.name })
        return filtered
      }
      return acc
    }, [])
    .sort((a, b) => a.date.localeCompare(b.date))

  // Similar products (same category or brand, limit 4)
  let similarProducts: any[] = []
  if (product.category_id) {
    const { data: similar } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', product.category_id)
      .neq('id', product.id)
      .limit(8)

    if (similar && similar.length > 0) {
      const similarIds = similar.map((p) => p.id)
      const { data: similarPrices } = await supabase
        .from('prices')
        .select('*, supplier:suppliers(*)')
        .in('product_id', similarIds)
        .order('scraped_at', { ascending: false })

      const latestSimilarPrices = aggregateLatestPrices(similarPrices || [])
      similarProducts = buildProductsWithPrices(similar, latestSimilarPrices)
        .sort((a, b) => b.store_count - a.store_count)
        .slice(0, 4)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span className="mx-2">/</span>
        {category ? (
          <>
            <Link href={`/categorias/${category.slug}`} className="hover:text-foreground">
              {category.name}
            </Link>
            <span className="mx-2">/</span>
          </>
        ) : null}
        <span className="text-foreground line-clamp-1">{product.name}</span>
      </nav>

      {/* Product Header */}
      <div className="grid lg:grid-cols-[1fr,1.2fr] gap-8 mb-8">
        {/* Left: Image + Info */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <ProductImage
              imageUrl={product.image_url}
              productName={product.name}
              categorySlug={category?.slug}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              {product.brand && (
                <Badge variant="secondary" className="mb-2">
                  {product.brand}
                </Badge>
              )}
              <h1 className="text-xl lg:text-2xl font-bold text-foreground mb-2">
                {product.name}
              </h1>
              {category && (
                <Link
                  href={`/categorias/${category.slug}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {category.name}
                </Link>
              )}

              {/* Price range */}
              <div className="mt-4">
                {lowestPrice > 0 ? (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-price">{formatCLP(lowestPrice)}</span>
                      {highestPrice > lowestPrice && (
                        <span className="text-sm text-muted-foreground">
                          — {formatCLP(highestPrice)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      en {currentPrices.length} {currentPrices.length === 1 ? 'tienda' : 'tiendas'}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Sin precio disponible</p>
                )}
              </div>

              {/* Savings indicator */}
              <div className="mt-3">
                <SavingsIndicator lowestPrice={lowestPrice} highestPrice={highestPrice} />
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                <FavoriteButton productId={product.id} />
                <PriceAlertButton productId={product.id} currentLowest={lowestPrice} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Best price card */}
        <div>
          <BestPriceCard prices={currentPrices} />
        </div>
      </div>

      {/* Price comparison table */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Comparar precios ({currentPrices.length} {currentPrices.length === 1 ? 'tienda' : 'tiendas'})
          </h2>
        </div>
        <EnhancedPriceTable prices={currentPrices} />
      </div>

      {/* Price history chart */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Historial de precios (últimos 30 días)
        </h2>
        <PriceChart priceHistory={priceHistory} />
      </div>

      {/* Similar products */}
      <div className="mb-8">
        <SimilarProducts products={similarProducts} />
      </div>
    </div>
  )
}
