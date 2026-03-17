import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { aggregateLatestPrices, buildProductsWithPrices } from '@/lib/queries/products'
import ProductCard from '@/components/ProductCard'
import FilterPanel from '@/components/filters/FilterPanel'
import SortSelect from '@/components/filters/SortSelect'

const BASE_URL = 'https://www.dentalprecios.cl'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: category } = await supabase
    .from('categories')
    .select('name, slug')
    .eq('slug', slug)
    .single()

  if (!category) return {}

  // Get product count for richer description
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', (await supabase.from('categories').select('id').eq('slug', slug).single()).data?.id || '')

  const productCount = count || 0
  const title = `${category.name} — Comparar precios de productos dentales en Chile`
  const description = `Compara precios de ${category.name.toLowerCase()} entre los principales proveedores dentales de Chile. ${productCount > 0 ? `${productCount} productos disponibles. ` : ''}Encuentra el mejor precio en ${category.name.toLowerCase()} — composites, instrumental, adhesivos y más.`
  const url = `${BASE_URL}/categorias/${category.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'DentalPrecios',
      locale: 'es_CL',
      type: 'website',
    },
    robots: { index: true, follow: true },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    page?: string
    brand?: string
    supplier?: string
    in_stock?: string
    sort?: string
  }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const page = parseInt(sp.page || '1')
  const brandFilter = sp.brand ? sp.brand.split(',') : []
  const supplierFilter = sp.supplier ? sp.supplier.split(',') : []
  const inStockOnly = sp.in_stock === '1'
  const sort = sp.sort || 'name'
  const limit = 24
  const offset = (page - 1) * limit

  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!category) notFound()

  let productQuery = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('category_id', category.id)

  if (brandFilter.length > 0) {
    productQuery = productQuery.in('brand', brandFilter)
  }

  const { data: products, count } = await productQuery
    .range(offset, offset + limit - 1)
    .order('name')

  const productIds = products?.map((p) => p.id) || []
  const { data: prices } =
    productIds.length > 0
      ? await supabase
          .from('prices')
          .select('*, supplier:suppliers(*)')
          .in('product_id', productIds)
          .order('scraped_at', { ascending: false })
      : { data: [] }

  const latestPrices = aggregateLatestPrices(prices || [])
  let productsWithPrices = buildProductsWithPrices(products || [], latestPrices)

  if (supplierFilter.length > 0) {
    productsWithPrices = productsWithPrices.filter((p) =>
      p.prices.some((price) => supplierFilter.includes(price.supplier_id))
    )
  }

  if (inStockOnly) {
    productsWithPrices = productsWithPrices.filter((p) =>
      p.prices.some((price) => price.in_stock)
    )
  }

  if (sort === 'price_asc') {
    productsWithPrices.sort((a, b) => {
      if (a.catalog_only && !b.catalog_only) return 1
      if (!a.catalog_only && b.catalog_only) return -1
      if (a.catalog_only && b.catalog_only) return a.name.localeCompare(b.name)
      return (a.lowest_price || Infinity) - (b.lowest_price || Infinity)
    })
  } else if (sort === 'price_desc') {
    productsWithPrices.sort((a, b) => {
      if (a.catalog_only && !b.catalog_only) return 1
      if (!a.catalog_only && b.catalog_only) return -1
      if (a.catalog_only && b.catalog_only) return a.name.localeCompare(b.name)
      return (b.lowest_price || 0) - (a.lowest_price || 0)
    })
  } else if (sort === 'stores') {
    productsWithPrices.sort((a, b) => b.store_count - a.store_count)
  }

  const availableBrands = [...new Set((products || []).map((p) => p.brand).filter(Boolean) as string[])].sort()
  const supplierMap = new Map<string, string>()
  for (const price of prices || []) {
    if (price.supplier) {
      supplierMap.set(price.supplier.id, price.supplier.name)
    }
  }
  const availableSuppliers = [...supplierMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const total = count || 0
  const pages = Math.ceil(total / limit)

  const buildUrl = (p: number) => {
    const u = new URLSearchParams()
    if (p > 1) u.set('page', String(p))
    if (brandFilter.length > 0) u.set('brand', brandFilter.join(','))
    if (supplierFilter.length > 0) u.set('supplier', supplierFilter.join(','))
    if (inStockOnly) u.set('in_stock', '1')
    if (sort !== 'name') u.set('sort', sort)
    const qs = u.toString()
    return `/categorias/${slug}${qs ? `?${qs}` : ''}`
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Categorías', item: `${BASE_URL}/categorias` },
      { '@type': 'ListItem', position: 3, name: category.name, item: `${BASE_URL}/categorias/${slug}` },
    ],
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span className="mx-2">/</span>
        <Link href="/categorias" className="hover:text-foreground">Categor&iacute;as</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{category.name}</span>
      </nav>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-24 bg-card rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Filtros</h2>
            <FilterPanel
              brands={availableBrands}
              suppliers={availableSuppliers}
              activeFilters={{
                brands: brandFilter,
                suppliers: supplierFilter,
                inStock: inStockOnly,
                sort,
              }}
              basePath={`/categorias/${slug}`}
            />
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {category.name} — Comparar precios en Chile
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {total} producto{total !== 1 ? 's' : ''} de {category.name.toLowerCase()} disponibles para comparar entre proveedores
              </p>
            </div>
            <SortSelect />
          </div>

          {productsWithPrices.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {productsWithPrices.map((product) => (
                <ProductCard key={product.id} product={product} view="grid" />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">No hay productos en esta categor&iacute;a</p>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {page > 1 && (
                <Link
                  href={buildUrl(page - 1)}
                  className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent text-sm transition-colors"
                >
                  Anterior
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-muted-foreground">
                P&aacute;gina {page} de {pages}
              </span>
              {page < pages && (
                <Link
                  href={buildUrl(page + 1)}
                  className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent text-sm transition-colors"
                >
                  Siguiente
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
