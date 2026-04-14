import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCLP, aggregateLatestPrices, buildProductsWithPrices } from '@/lib/queries/products'
import { OFFER_SHIPPING_DETAILS_CL, MERCHANT_RETURN_POLICY_CL } from '@/lib/schema-offer-policies'
import ProductCard from '@/components/ProductCard'
import SortSelect from '@/components/filters/SortSelect'

const BASE_URL = 'https://www.dentalprecios.cl'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'resinas-compuestas')
    .single()

  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', category?.id || '')

  const productCount = count || 0
  const title = 'Resina Dental Precio Chile — Compara 70 Proveedores'
  const description = `¿Cuánto cuesta la resina dental en Chile? Filtek Z350, Charisma Diamond, Tetric y más. Precios actualizados entre 70 proveedores dentales.`

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/precios/resina-compuesta` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/precios/resina-compuesta`,
      siteName: 'DentalPrecios',
      locale: 'es_CL',
      type: 'website',
    },
    robots: { index: true, follow: true },
  }
}

export default async function ResinaPreciosPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const { sort = 'price_asc' } = await searchParams
  const supabase = await createClient()

  // Get resinas-compuestas category
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', 'resinas-compuestas')
    .single()

  if (!category) return null

  // Fetch all products in category
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', category.id)
    .order('name')

  // Fetch latest prices with supplier info
  const productIds = (products || []).map((p) => p.id)
  const { data: allPrices } = await supabase
    .from('prices')
    .select('*, supplier:suppliers(*)')
    .in('product_id', productIds)
    .order('scraped_at', { ascending: false })

  const filteredPrices = (allPrices || []).filter((p: any) => p.supplier?.active !== false)
  const latestPrices = aggregateLatestPrices(filteredPrices)
  let productsWithPrices = buildProductsWithPrices(products || [], latestPrices)
    .filter((p) => p.lowest_price > 0)

  // Get unique supplier count
  const supplierIds = new Set<string>()
  for (const p of productsWithPrices) {
    for (const price of p.prices) {
      if (price.supplier_id) supplierIds.add(price.supplier_id)
    }
  }

  // Sort
  switch (sort) {
    case 'price_asc':
      productsWithPrices.sort((a, b) => a.lowest_price - b.lowest_price)
      break
    case 'price_desc':
      productsWithPrices.sort((a, b) => b.lowest_price - a.lowest_price)
      break
    case 'stores':
      productsWithPrices.sort((a, b) => b.store_count - a.store_count)
      break
    case 'name':
    default:
      productsWithPrices.sort((a, b) => a.name.localeCompare(b.name))
      break
  }

  const lowestOverall = productsWithPrices.length > 0
    ? Math.min(...productsWithPrices.map((p) => p.lowest_price))
    : 0
  const highestOverall = productsWithPrices.length > 0
    ? Math.max(...productsWithPrices.map((p) => p.highest_price || p.lowest_price))
    : 0
  const totalOffers = productsWithPrices.reduce((sum, p) => sum + p.store_count, 0)

  // Top-level Product schema with flat Offer list — optimized for AI Overview
  // (Google SGE, Perplexity, ChatGPT) which prefer a primary Product entity
  const productSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Resinas Dentales — Composites para restauraciones',
    description: `Comparativa de precios de ${productsWithPrices.length} resinas compuestas dentales en Chile entre +70 proveedores. Filtek, Tetric, Herculite, Vittra y más.`,
    category: 'Resinas compuestas dentales',
    brand: { '@type': 'Brand', name: '3M Filtek, Ivoclar Tetric, Kerr Herculite, FGM Vittra, Tokuyama Estelite' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'CLP',
      lowPrice: lowestOverall,
      highPrice: highestOverall,
      offerCount: totalOffers,
      availability: 'https://schema.org/InStock',
      offers: productsWithPrices.slice(0, 50).flatMap((p) =>
        p.prices
          .filter((pr: any) => pr.price > 0 && pr.in_stock)
          .map((pr: any) => ({
            '@type': 'Offer',
            name: p.name,
            price: pr.price,
            priceCurrency: 'CLP',
            availability: 'https://schema.org/InStock',
            url: `${BASE_URL}/producto/${p.id}`,
            seller: {
              '@type': 'Organization',
              name: pr.supplier?.name,
            },
            shippingDetails: OFFER_SHIPPING_DETAILS_CL,
            hasMerchantReturnPolicy: MERCHANT_RETURN_POLICY_CL,
          }))
      ),
    },
  })

  // JSON-LD structured data (server-rendered, trusted content only)
  const itemListSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Precios de Resinas Dentales en Chile',
    description: `Comparativa de precios de ${productsWithPrices.length} resinas compuestas entre proveedores dentales en Chile.`,
    numberOfItems: productsWithPrices.length,
    itemListElement: productsWithPrices.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        url: `${BASE_URL}/producto/${p.id}`,
        ...(p.brand && { brand: { '@type': 'Brand', name: p.brand } }),
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'CLP',
          lowPrice: p.lowest_price,
          ...(p.highest_price && { highPrice: p.highest_price }),
          offerCount: p.store_count,
        },
      },
    })),
  })

  const faqSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Cuánto cuesta la resina dental en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `El precio de una resina compuesta en Chile varía entre ${formatCLP(lowestOverall)} y ${formatCLP(highestOverall)} CLP dependiendo del proveedor y la marca. DentalPrecios compara ${productsWithPrices.length} resinas de ${supplierIds.size} proveedores y actualiza los precios diariamente.`,
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué proveedor tiene el precio más bajo en resina compuesta en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `El precio más bajo depende del producto específico y del momento de compra. DentalPrecios compara precios en tiempo real entre ${supplierIds.size} proveedores chilenos para que identifiques el precio más bajo sin contactar a cada proveedor por separado.`,
        },
      },
      {
        '@type': 'Question',
        name: '¿Vale la pena comparar precios de insumos dentales en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Sí. Los mismos insumos dentales pueden costar hasta un 65% más dependiendo del proveedor. DentalPrecios muestra precios actualizados de ${supplierIds.size} proveedores en un solo lugar, sin necesidad de cotizar individualmente.`,
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué resina compuesta recomiendan los dentistas en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Las resinas más usadas en Chile son Filtek Z350 XT (3M), Charisma Diamond (Kulzer) y Tetric EvoFlow (Ivoclar Vivadent). La elección depende de la indicación clínica: Z350 XT destaca por su pulido en sectores anteriores, Charisma Diamond por su naturalidad en estratificación, Tetric EvoFlow como fluida de alta resistencia.',
        },
      },
    ],
  })

  const breadcrumbSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Precios', item: `${BASE_URL}/precios` },
      { '@type': 'ListItem', position: 3, name: 'Resinas Compuestas', item: `${BASE_URL}/precios/resina-compuesta` },
    ],
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbSchema }} />

      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span className="mx-2">/</span>
        <Link href="/categorias" className="hover:text-foreground">Categorías</Link>
        <span className="mx-2">/</span>
        <Link href="/categorias/resinas-compuestas" className="hover:text-foreground">Resinas Compuestas</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Precios</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Precios de Resinas Dentales en Chile
            </h1>
            <p className="text-muted-foreground mt-2">
              {productsWithPrices.length} resinas compuestas comparadas entre {supplierIds.size} proveedores
              {lowestOverall > 0 && (
                <span className="text-price font-medium"> — desde {formatCLP(lowestOverall)}</span>
              )}
            </p>
          </div>
          <SortSelect />
        </div>
      </div>

      {/* Product Grid */}
      {productsWithPrices.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
          {productsWithPrices.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No hay resinas con precio disponible en este momento.
        </div>
      )}

      {/* SEO Content Block */}
      <section className="bg-card rounded-xl border border-border p-6 mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Resinas compuestas: guía de precios en Chile
        </h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 max-w-3xl">
          <p>
            Las resinas dentales son el material restaurador directo más utilizado en odontología moderna.
            En Chile, los precios de composites varían significativamente entre proveedores — una misma
            jeringa de resina compuesta puede costar hasta un 40% más dependiendo de dónde se compre.
          </p>
          <p>
            DentalPrecios compara diariamente los precios de resinas de marcas como 3M Filtek (Z350 XT,
            Z250, Easy Match), Ivoclar Tetric (N-Ceram, PowerFill), Kerr Herculite, FGM Vittra y
            Tokuyama Estelite entre más de 70 proveedores dentales en Chile. Cada precio incluye
            disponibilidad de stock y enlace directo al proveedor.
          </p>
          <p>
            Ya sea que busques composites nanohíbridos para restauraciones estéticas, resinas bulk fill
            para cavidades clase II o composites fluidos para sellado de fisuras, esta comparativa te
            permite encontrar el mejor precio sin necesidad de cotizar tienda por tienda.
          </p>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Link
            href="/comparar/filtek-z350-xt-vs-charisma-diamond"
            className="text-sm text-primary hover:underline"
          >
            Filtek Z350 XT vs Charisma Diamond →
          </Link>
          <Link
            href="/precios/adhesivos-dentales"
            className="text-sm text-primary hover:underline"
          >
            Precios de adhesivos dentales →
          </Link>
          <Link
            href="/blog/ionomero-vs-resina-precio-chile"
            className="text-sm text-primary hover:underline"
          >
            ¿Ionómero o resina? Guía clínica →
          </Link>
          <Link
            href="/categorias/resinas-compuestas"
            className="text-sm text-primary hover:underline"
          >
            Ver catálogo completo →
          </Link>
        </div>
      </section>
    </div>
  )
}
