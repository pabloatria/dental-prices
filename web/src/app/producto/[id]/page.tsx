import Link from 'next/link'
import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import { formatCLP, aggregateLatestPrices, buildProductsWithPrices } from '@/lib/queries/products'
import { OFFER_SHIPPING_DETAILS_CL, MERCHANT_RETURN_POLICY_CL } from '@/lib/schema-offer-policies'
import ProductImage from '@/components/ProductImage'
import PriceChart from '@/components/PriceChart'
import EnhancedPriceTable from '@/components/product/EnhancedPriceTable'
import BestPriceCard from '@/components/product/BestPriceCard'
import SavingsIndicator from '@/components/product/SavingsIndicator'
import FavoriteButton from '@/components/product/FavoriteButton'
import PriceAlertButton from '@/components/product/PriceAlertButton'
import SimilarProducts from '@/components/product/SimilarProducts'
import ProductSpecs from '@/components/product/ProductSpecs'
import StickyMobilePriceCTA from '@/components/product/StickyMobilePriceCTA'
import TrackProductView from '@/components/analytics/TrackProductView'
import StarRating from '@/components/product/StarRating'
import { Badge } from '@/components/ui/badge'

const BASE_URL = 'https://www.dentalprecios.cl'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = createPublicClient()
  const { data: product } = await supabase
    .from('products')
    .select('name, brand, image_url, category_id')
    .eq('id', id)
    .single()

  if (!product) return {}

  const brandText = product.brand ? ` ${product.brand}` : ''
  const title = `${product.name}${brandText} — Comparar precios en Chile`
  const description = `Compara precios de ${product.name}${brandText} entre múltiples proveedores dentales en Chile. Encuentra el precio más bajo y ahorra en tu compra.`
  const url = `${BASE_URL}/producto/${id}`

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
      ...(product.image_url && {
        images: [{ url: product.image_url, alt: product.name }],
      }),
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createPublicClient()

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

  // Get all prices with supplier info (only active suppliers)
  const { data: allPricesRaw } = await supabase
    .from('prices')
    .select('*, supplier:suppliers(*)')
    .eq('product_id', id)
    .order('scraped_at', { ascending: false })

  const allPrices = (allPricesRaw || []).filter((p: any) => p.supplier?.active !== false)

  // Latest price per supplier
  const latestBySupplier = new Map()
  for (const price of allPrices || []) {
    if (!latestBySupplier.has(price.supplier_id)) {
      latestBySupplier.set(price.supplier_id, price)
    }
  }
  const currentPrices = Array.from(latestBySupplier.values())
  const realPrices = currentPrices.filter((p) => p.price > 0)
  const inStockPrices = realPrices.filter((p) => p.in_stock)
  const lowestPrice = inStockPrices.length > 0 ? Math.min(...inStockPrices.map((p: any) => p.price)) : 0
  const highestPrice = realPrices.length > 0 ? Math.max(...realPrices.map((p: any) => p.price)) : 0
  const isCatalogOnly = currentPrices.length > 0 && realPrices.length === 0

  // Price history (last 30 days, lowest price per day)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const priceHistory = (allPrices || [])
    .filter((p) => p.price > 0 && new Date(p.scraped_at) >= thirtyDaysAgo)
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

  // Fetch product specs
  const { data: specData } = await supabase
    .from('product_specs')
    .select('composition, indications, contraindications, technique_tips, properties, compatible_products, comparison_notes, ai_generated, reviewed')
    .eq('product_id', id)
    .single()

  // Fetch aggregate rating
  const { data: ratingsData } = await supabase
    .from('product_ratings')
    .select('rating')
    .eq('product_id', id)

  const ratingCount = ratingsData?.length || 0
  const ratingAverage = ratingCount > 0
    ? Math.round((ratingsData!.reduce((sum, r) => sum + r.rating, 0) / ratingCount) * 10) / 10
    : 0

  // JSON-LD: Product schema
  const packSuffix = product.pack_size && product.pack_size > 1 ? ` (pack de ${product.pack_size})` : ''
  const fallbackDescription = `${product.name}${product.brand ? ` (${product.brand})` : ''}${packSuffix}: compara precios entre proveedores dentales en Chile. Datos actualizados de stock y precio.`
  const productSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || fallbackDescription,
    ...(product.brand && { brand: { '@type': 'Brand', name: product.brand } }),
    ...(product.image_url && { image: product.image_url }),
    ...(category && { category: category.name }),
    ...(product.pack_size && product.pack_size > 1 && {
      additionalProperty: [
        {
          '@type': 'PropertyValue',
          name: 'Pack size',
          value: product.pack_size,
          unitText: 'unidades',
        },
      ],
    }),
    url: `${BASE_URL}/producto/${product.id}`,
  }

  if (ratingCount > 0) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: ratingAverage,
      bestRating: 5,
      worstRating: 1,
      ratingCount: ratingCount,
    }
  }

  if (lowestPrice > 0) {
    productSchema.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'CLP',
      lowPrice: lowestPrice,
      highPrice: highestPrice || lowestPrice,
      offerCount: currentPrices.length,
      offers: currentPrices
        .filter((p: any) => p.price > 0)
        .map((p: any) => ({
          '@type': 'Offer',
          price: p.price,
          priceCurrency: 'CLP',
          availability: p.in_stock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: p.supplier?.name,
          },
          url: p.product_url,
          shippingDetails: OFFER_SHIPPING_DETAILS_CL,
          hasMerchantReturnPolicy: MERCHANT_RETURN_POLICY_CL,
        })),
    }
  } else {
    productSchema.offers = {
      '@type': 'Offer',
      priceCurrency: 'CLP',
      availability: 'https://schema.org/OutOfStock',
      price: 0,
      shippingDetails: OFFER_SHIPPING_DETAILS_CL,
      hasMerchantReturnPolicy: MERCHANT_RETURN_POLICY_CL,
    }
  }

  // JSON-LD: BreadcrumbList
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
  ]
  if (category) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: category.name,
      item: `${BASE_URL}/categorias/${category.slug}`,
    })
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 3,
      name: product.name,
      item: `${BASE_URL}/producto/${product.id}`,
    })
  } else {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: product.name,
      item: `${BASE_URL}/producto/${product.id}`,
    })
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-28 lg:pb-6">
      <TrackProductView productId={product.id} productName={product.name} brand={product.brand || undefined} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-1 min-w-0">
        <Link href="/" className="hover:text-foreground shrink-0">Inicio</Link>
        <span className="shrink-0">/</span>
        {category ? (
          <>
            <Link href={`/categorias/${category.slug}`} className="hover:text-foreground shrink-0 truncate max-w-[40%]">
              {category.name}
            </Link>
            <span className="shrink-0">/</span>
          </>
        ) : null}
        <span className="text-foreground truncate">{product.name}</span>
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
              <div className="flex flex-wrap gap-2 mb-2">
                {product.brand && (
                  <Badge variant="secondary">
                    {product.brand}
                  </Badge>
                )}
                {product.pack_size && product.pack_size > 1 && (
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    Pack de {product.pack_size}
                  </Badge>
                )}
              </div>
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

              {/* Product description */}
              {product.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                  {product.description}
                </p>
              )}

              {/* Star rating */}
              <div className="mt-2">
                <StarRating productId={product.id} />
              </div>

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
                ) : isCatalogOnly ? (
                  <div>
                    <p className="text-sm font-medium text-primary">Consultar precio</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Disponible en {currentPrices.length} {currentPrices.length === 1 ? 'proveedor' : 'proveedores'}
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
          <BestPriceCard prices={currentPrices} productId={product.id} />
        </div>
      </div>

      {/* Technical specs */}
      {specData && <ProductSpecs spec={specData} />}

      {/* Price comparison table */}
      <div id="comparar-precios" className="bg-card rounded-xl border border-border p-6 mb-8 scroll-mt-24">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {isCatalogOnly
              ? `Proveedores (${currentPrices.length})`
              : `Comparar precios (${currentPrices.length} ${currentPrices.length === 1 ? 'tienda' : 'tiendas'})`}
          </h2>
        </div>
        <EnhancedPriceTable prices={currentPrices} productId={product.id} />
      </div>

      {/* Price history chart — only for products with real prices */}
      {priceHistory.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Historial de precios (últimos 30 días)
          </h2>
          <PriceChart priceHistory={priceHistory} />
        </div>
      )}

      {/* Brand-specific editorial — implant brands
          Targets commercial long-tail: "precio implante dental straumann chile distribuidor"
          (GSC pos 4.5), "precio pilar protesico implante dental chile" and similar. */}
      {(() => {
        const brandLower = (product.brand || '').toLowerCase()
        const isImplantBrand =
          brandLower.includes('straumann') ||
          brandLower.includes('nobel biocare') ||
          brandLower.includes('nobel bio') ||
          brandLower.includes('neodent')
        if (!isImplantBrand) return null

        const brandName = product.brand || ''
        const brandLabel = brandLower.includes('straumann')
          ? 'Straumann'
          : brandLower.includes('neodent')
            ? 'Neodent'
            : 'Nobel Biocare'

        return (
          <section className="bg-card rounded-xl border border-border p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Distribuidores de {brandLabel} en Chile — comparar precios
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3 max-w-3xl">
              <p>
                {brandLabel} es una de las marcas de implantología oral con mayor penetración en
                Chile y ofrece su catálogo a través de múltiples distribuidores autorizados. El
                precio final del mismo código de referencia —implante, pilar, aditamento protésico
                o instrumental— puede variar de forma significativa según el proveedor, la
                presentación (unitaria o caja) y los descuentos vigentes.
              </p>
              <p>
                En DentalPrecios consolidamos los precios actualizados de {brandName || brandLabel}{' '}
                entre distribuidores activos en Chile, con datos verificados diariamente. Esto te
                permite identificar el proveedor con mejor precio para una referencia específica
                sin cotizar uno por uno. Para cirugías programadas donde se requiere confirmar
                stock de varias referencias al mismo tiempo, la comparativa aquí es el punto de
                partida antes de emitir la orden de compra.
              </p>
              <p>
                Si estás evaluando {brandLabel} frente a otras marcas del sistema (Nobel Biocare,
                Straumann, Neodent, BioHorizons, Dentium), revisa nuestra{' '}
                <Link
                  href="/blog/implantes-dentales-precio-chile-2026"
                  className="text-primary hover:underline"
                >
                  guía de precios de implantes dentales en Chile 2026
                </Link>
                , con comparativas entre sistemas y rangos de precio por tipo de aditamento.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/categorias/implantes"
                className="text-sm text-primary hover:underline"
              >
                Ver catálogo completo de implantes →
              </Link>
              <Link
                href="/blog/implantes-dentales-precio-chile-2026"
                className="text-sm text-primary hover:underline"
              >
                Guía: precios de implantes en Chile 2026 →
              </Link>
            </div>
          </section>
        )
      })()}

      {/* Similar products */}
      <div className="mb-8">
        <SimilarProducts products={similarProducts} />
      </div>

      {/* Mobile sticky price CTA — desktop already shows prices in the hero grid */}
      <StickyMobilePriceCTA lowestPrice={lowestPrice} storeCount={currentPrices.length} />
    </div>
  )
}
