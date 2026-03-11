import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { aggregateLatestPrices, buildProductsWithPrices } from '@/lib/queries/products'
import HeroSection from '@/components/home/HeroSection'
import TrendingProducts from '@/components/home/TrendingProducts'
import SupplierShowcase from '@/components/home/SupplierShowcase'
import HowItWorks from '@/components/home/HowItWorks'
import { getCategoryIcon } from '@/components/icons/CategoryIllustrations'

export default async function Home() {
  const supabase = await createClient()

  // Fetch counts
  const [
    { count: productCount },
    { data: suppliers },
    { data: categories },
    { data: trendingProducts },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('suppliers').select('*').eq('active', true).order('name'),
    supabase
      .from('categories')
      .select('id, name, slug, parent_id')
      .is('parent_id', null)
      .order('name'),
    supabase
      .from('products')
      .select('*')
      .limit(8),
  ])

  // Get prices for trending products
  const trendingIds = trendingProducts?.map((p) => p.id) || []
  const { data: trendingPrices } = trendingIds.length > 0
    ? await supabase
        .from('prices')
        .select('*, supplier:suppliers(*)')
        .in('product_id', trendingIds)
        .order('scraped_at', { ascending: false })
    : { data: [] }

  const latestPrices = aggregateLatestPrices(trendingPrices || [])
  const productsWithPrices = buildProductsWithPrices(trendingProducts || [], latestPrices)
    .sort((a, b) => b.store_count - a.store_count)

  return (
    <>
      <HeroSection
        productCount={productCount || 0}
        supplierCount={suppliers?.length || 0}
      />

      {/* Categories */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Categor&iacute;as populares
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories?.map((cat) => {
              const Icon = getCategoryIcon(cat.slug)
              return (
                <Link
                  key={cat.id}
                  href={`/categorias/${cat.slug}`}
                  className="group flex flex-col items-center gap-3 p-6 bg-card rounded-xl border border-border hover:shadow-md hover:border-primary/20 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {cat.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <TrendingProducts products={productsWithPrices} />
      <SupplierShowcase suppliers={suppliers || []} />
      <HowItWorks />
    </>
  )
}
