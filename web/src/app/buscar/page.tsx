import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { aggregateLatestPrices, buildProductsWithPrices } from '@/lib/queries/products'
import ProductCard from '@/components/ProductCard'
import FilterPanel from '@/components/filters/FilterPanel'
import SortSelect from '@/components/filters/SortSelect'

const BASE_URL = 'https://www.dentalprecios.cl'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}): Promise<Metadata> {
  const params = await searchParams
  const query = params.q
  const category = params.category

  if (query) {
    const title = `${query} — Comparar precios en Chile`
    const description = `Compara precios de ${query} entre múltiples proveedores dentales en Chile. Encuentra el precio más bajo de ${query} en DentalPrecios.`
    return {
      title,
      description,
      alternates: { canonical: `${BASE_URL}/buscar` },
      openGraph: {
        title,
        description,
        url: `${BASE_URL}/buscar`,
        siteName: 'DentalPrecios',
        locale: 'es_CL',
        type: 'website',
      },
      robots: { index: false, follow: true },
    }
  }

  return {
    title: 'Buscar productos dentales — DentalPrecios',
    description:
      'Busca y compara precios de insumos dentales, composites, adhesivos, resinas, instrumental y más entre los principales proveedores de Chile.',
    alternates: { canonical: `${BASE_URL}/buscar` },
    robots: { index: true, follow: true },
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    page?: string
    category?: string
    brand?: string
    supplier?: string
    in_stock?: string
    sort?: string
  }>
}) {
  const params = await searchParams
  const query = params.q || ''
  const category = params.category
  const page = parseInt(params.page || '1')
  const brandFilter = params.brand ? params.brand.split(',') : []
  const supplierFilter = params.supplier ? params.supplier.split(',') : []
  const inStockOnly = params.in_stock === '1'
  const sort = params.sort || 'name'
  const limit = 24
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

  if (brandFilter.length > 0) {
    productQuery = productQuery.in('brand', brandFilter)
  }

  const { data: products, count, error } = await productQuery
    .range(offset, offset + limit - 1)
    .order('name')

  if (error || !products) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-xl text-muted-foreground">Error al buscar productos</p>
        <p className="text-sm text-muted-foreground mt-2">Intenta de nuevo m&aacute;s tarde</p>
      </div>
    )
  }

  const productIds = products.map((p) => p.id)

  const { data: prices } =
    productIds.length > 0
      ? await supabase
          .from('prices')
          .select('*, supplier:suppliers(*)')
          .in('product_id', productIds)
          .order('scraped_at', { ascending: false })
      : { data: [] }

  const latestPrices = aggregateLatestPrices(prices || [])
  let productsWithPrices = buildProductsWithPrices(products, latestPrices)

  // Client-side supplier filter
  if (supplierFilter.length > 0) {
    productsWithPrices = productsWithPrices.filter((p) =>
      p.prices.some((price) => supplierFilter.includes(price.supplier_id))
    )
  }

  // Client-side in-stock filter
  if (inStockOnly) {
    productsWithPrices = productsWithPrices.filter((p) =>
      p.prices.some((price) => price.in_stock)
    )
  }

  // Sort — catalog-only products (lowest_price=0, catalog_only=true) go to the end for price sorts
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

  // Extract available brands and suppliers for filters
  const availableBrands = [...new Set(products.map((p) => p.brand).filter(Boolean) as string[])].sort()
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
    if (query) u.set('q', query)
    if (p > 1) u.set('page', String(p))
    if (brandFilter.length > 0) u.set('brand', brandFilter.join(','))
    if (supplierFilter.length > 0) u.set('supplier', supplierFilter.join(','))
    if (inStockOnly) u.set('in_stock', '1')
    if (sort !== 'name') u.set('sort', sort)
    return `/buscar?${u.toString()}`
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Búsqueda', item: `${BASE_URL}/buscar` },
    ],
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">B&uacute;squeda</span>
      </nav>

      <div className="flex gap-8">
        {/* Sidebar filters - desktop */}
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
              basePath="/buscar"
              baseQuery={query}
            />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {query ? <>Resultados para &quot;{query}&quot;</> : 'Todos los productos'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {total} producto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
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
              <p className="text-xl text-muted-foreground">No se encontraron productos</p>
              <p className="text-sm text-muted-foreground mt-2">
                Intenta con otro t&eacute;rmino de b&uacute;squeda
              </p>
            </div>
          )}

          {/* Pagination */}
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
