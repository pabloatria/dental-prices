import Link from 'next/link'
import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { formatCLP, fetchLatestPricesForProducts, buildProductsWithPrices } from '@/lib/queries/products'
import { OFFER_SHIPPING_DETAILS_CL, MERCHANT_RETURN_POLICY_CL } from '@/lib/schema-offer-policies'
import ProductCard from '@/components/ProductCard'
import SortSelect from '@/components/filters/SortSelect'

const BASE_URL = 'https://www.dentalprecios.cl'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createPublicClient()

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'cementos-adhesivos')
    .single()

  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', category?.id || '')

  const productCount = count || 0
  const title = 'Adhesivo Dental Precio Chile, Compara 70 Proveedores'
  const description = `¿Cuánto cuesta el adhesivo dental en Chile? Single Bond, Clearfil, Ambar, RelyX y ${productCount} productos más. Precios actualizados entre 70 proveedores dentales.`

  return {
    title,
    description,
    keywords: [
      'adhesivo dental',
      'cemento dental',
      'adhesivo dental precio chile',
      'bonding dental chile',
      'Single Bond Universal precio',
      'Clearfil SE Bond precio',
    ],
    alternates: { canonical: `${BASE_URL}/precios/adhesivos-dentales` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/precios/adhesivos-dentales`,
      siteName: 'DentalPrecios',
      locale: 'es_CL',
      type: 'website',
    },
    robots: { index: true, follow: true },
  }
}

export default async function AdhesivosPreciosPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const { sort = 'price_asc' } = await searchParams
  const supabase = createPublicClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', 'cementos-adhesivos')
    .single()

  if (!category) return null

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', category.id)
    .order('name')

  // RPC bypasses PostgREST 1000-row cap on `.in('product_id', ids)`.
  const productIds = (products || []).map((p) => p.id)
  const latestPrices = await fetchLatestPricesForProducts(supabase, productIds)
  let productsWithPrices = buildProductsWithPrices(products || [], latestPrices)
    .filter((p) => p.lowest_price > 0)

  const supplierIds = new Set<string>()
  for (const p of productsWithPrices) {
    for (const price of p.prices) {
      if (price.supplier_id) supplierIds.add(price.supplier_id)
    }
  }

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

  // Product + AggregateOffer schema, server-rendered trusted content only
  const productSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Adhesivos Dentales y Cementos en Chile',
    description: `Comparativa de precios de ${productsWithPrices.length} adhesivos dentales y cementos en Chile entre +70 proveedores. Single Bond, Clearfil, Ambar, RelyX, Variolink y más.`,
    category: 'Adhesivos dentales y cementos',
    brand: { '@type': 'Brand', name: '3M, Kuraray, Ivoclar Vivadent, FGM, Kerr' },
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

  const itemListSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Precios de Adhesivos Dentales y Cementos en Chile',
    description: `Comparativa de precios de ${productsWithPrices.length} adhesivos y cementos entre proveedores dentales en Chile.`,
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
        name: '¿Cuánto cuesta un adhesivo dental en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `El precio de adhesivos dentales en Chile varía entre ${formatCLP(lowestOverall)} y ${formatCLP(highestOverall)} CLP dependiendo del producto, la marca y el proveedor. DentalPrecios compara ${productsWithPrices.length} adhesivos y cementos de ${supplierIds.size} proveedores con precios actualizados diariamente.`,
        },
      },
      {
        '@type': 'Question',
        name: '¿Cuál es el mejor adhesivo dental calidad-precio en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Los adhesivos más usados en Chile son Single Bond Universal (3M), Clearfil SE Bond (Kuraray) y Ambar Universal (FGM). La diferencia de precio entre proveedores para el mismo producto puede superar el 40%, por lo que comparar antes de comprar tiene más impacto que elegir entre marcas.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué diferencia hay entre un adhesivo universal y un cemento de resina?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'El adhesivo dental (bonding) se usa en restauraciones directas para unir la resina compuesta al diente. El cemento de resina se usa para cementar restauraciones indirectas como coronas, carillas e inlays. Algunos sistemas como RelyX Universal combinan ambas funciones. En esta comparativa incluimos ambos para que compares precios del sistema completo.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Dónde comprar adhesivo dental al mejor precio en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `DentalPrecios compara ${productsWithPrices.length} adhesivos y cementos dentales de ${supplierIds.size} proveedores chilenos en un solo lugar. Los precios se actualizan diariamente con enlace directo a cada tienda, sin necesidad de cotizar proveedor por proveedor.`,
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
      { '@type': 'ListItem', position: 3, name: 'Adhesivos Dentales', item: `${BASE_URL}/precios/adhesivos-dentales` },
    ],
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* JSON-LD, server-rendered trusted content only */}
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
        <Link href="/categorias/cementos-adhesivos" className="hover:text-foreground">Cementos y Adhesivos</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Precios</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Precios de Adhesivos Dentales y Cementos en Chile
            </h1>
            <p className="text-muted-foreground mt-2">
              {productsWithPrices.length} adhesivos y cementos comparados entre {supplierIds.size} proveedores
              {lowestOverall > 0 && (
                <span className="text-price font-medium">, desde {formatCLP(lowestOverall)}</span>
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
          No hay adhesivos con precio disponible en este momento.
        </div>
      )}

      {/* SEO Content Block */}
      <section className="bg-card rounded-xl border border-border p-6 mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Adhesivos dentales y cementos: guía de precios en Chile
        </h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 max-w-3xl">
          <p>
            El adhesivo dental es el producto donde más plata se pierde por no comparar.
            Un frasco de Single Bond Universal puede costar hasta un 40% más en un proveedor
            que en otro, y cuando multiplicas eso por el consumo mensual de un consultorio
            activo, la diferencia es significativa.
          </p>
          <p>
            <strong>Sistemas adhesivos:</strong> los adhesivos universales (7ma generación)
            como Single Bond Universal, Clearfil Universal Bond Quick y Ambar Universal
            dominan el mercado por su versatilidad, funcionan con grabado total, selectivo
            o autograbante. Los autograbantes puros como Clearfil SE Bond siguen siendo
            referencia en dentina por su menor sensibilidad postoperatoria.
          </p>
          <p>
            <strong>Cementos de resina:</strong> los autoadhesivos como RelyX U200 simplifican
            el protocolo clínico. Los duales como Variolink Esthetic y Panavia V5 ofrecen mejor
            adhesión en restauraciones con acceso limitado de luz. Los fotopolimerizables como
            Variolink Esthetic LC son ideales para carillas finas donde el color importa.
          </p>
          <p>
            DentalPrecios compara diariamente los precios de adhesivos y cementos de 3M, Kuraray,
            Ivoclar, FGM, Kerr y más entre {supplierIds.size} proveedores dentales en Chile.
            Cada precio incluye disponibilidad de stock y enlace directo al proveedor.
          </p>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Link
            href="/blog/adhesivos-dentales-chile-2026"
            className="text-sm text-primary hover:underline"
          >
            Los 10 adhesivos más usados en Chile →
          </Link>
          <Link
            href="/blog/panavia-v5-vs-variolink-esthetic-2026"
            className="text-sm text-primary hover:underline"
          >
            Panavia V5 vs Variolink Esthetic →
          </Link>
          <Link
            href="/precios/resina-compuesta"
            className="text-sm text-primary hover:underline"
          >
            Precios de resinas compuestas →
          </Link>
          <Link
            href="/categorias/cementos-adhesivos"
            className="text-sm text-primary hover:underline"
          >
            Ver catálogo completo →
          </Link>
        </div>
      </section>
    </div>
  )
}
