import Link from 'next/link'
import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { formatCLP, aggregateLatestPrices, buildProductsWithPrices } from '@/lib/queries/products'
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
    .eq('slug', 'fresas-diamantes')
    .single()

  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', category?.id || '')

  const productCount = count || 0
  const title = 'Fresas Dentales Precio Chile — Carburo y Diamante'
  const description = `Precios de fresas dentales en Chile: carburo, diamante, acabado. Marcas Komet, Edenta comparadas entre los principales proveedores chilenos.`

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/precios/fresas-y-diamantes` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/precios/fresas-y-diamantes`,
      siteName: 'DentalPrecios',
      locale: 'es_CL',
      type: 'website',
    },
    robots: { index: true, follow: true },
  }
}

export default async function FresasPreciosPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const { sort = 'price_asc' } = await searchParams
  const supabase = createPublicClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', 'fresas-diamantes')
    .single()

  if (!category) return null

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', category.id)
    .order('name')

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

  // All JSON-LD schemas use server-rendered, trusted content only (no user input)
  const productSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Fresas Dentales — Carburo de tungsteno y diamante',
    description: `Comparativa de precios de ${productsWithPrices.length} fresas dentales en Chile entre +70 proveedores. Komet, Microdont, Edenta, SS White y más.`,
    category: 'Fresas dentales',
    brand: { '@type': 'Brand', name: 'Komet, Microdont, Edenta, SS White, Jota' },
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
            seller: { '@type': 'Organization', name: pr.supplier?.name },
            shippingDetails: OFFER_SHIPPING_DETAILS_CL,
            hasMerchantReturnPolicy: MERCHANT_RETURN_POLICY_CL,
          }))
      ),
    },
  })

  const itemListSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Precios de Fresas Dentales en Chile',
    description: `Comparativa de precios de ${productsWithPrices.length} fresas dentales entre proveedores en Chile.`,
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
        name: '¿Cuánto cuestan las fresas dentales en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `El precio de fresas dentales en Chile varía entre ${formatCLP(lowestOverall)} y ${formatCLP(highestOverall)} CLP dependiendo del tipo (diamante, carburo, acabado), la marca y el proveedor. DentalPrecios compara ${productsWithPrices.length} fresas de ${supplierIds.size} proveedores con precios actualizados diariamente.`,
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué tipos de fresas dentales existen?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Las fresas dentales se clasifican en fresas de diamante (para preparaciones cavitarias y acabado), fresas de carburo de tungsteno (para remoción de caries y tallado), fresas multilaminadas (para acabado fino) y piedras de Arkansas (para pulido). Se usan con turbina, contraángulo o pieza de mano recta según el procedimiento.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué marcas de fresas dentales se usan en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Las marcas más usadas en Chile son Komet (Alemania), Edenta (Suiza), Microdont (Brasil), SS White y Jota. DentalPrecios compara precios de todas estas marcas entre ${supplierIds.size} proveedores para que encuentres el mejor precio.`,
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
      { '@type': 'ListItem', position: 3, name: 'Fresas Dentales', item: `${BASE_URL}/precios/fresas-y-diamantes` },
    ],
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* JSON-LD structured data — server-rendered trusted content only */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbSchema }} />

      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span className="mx-2">/</span>
        <Link href="/categorias" className="hover:text-foreground">Categorías</Link>
        <span className="mx-2">/</span>
        <Link href="/categorias/fresas-diamantes" className="hover:text-foreground">Fresas y Diamantes</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Precios</span>
      </nav>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Precios de Fresas Dentales en Chile
            </h1>
            <p className="text-muted-foreground mt-2">
              {productsWithPrices.length} fresas comparadas entre {supplierIds.size} proveedores
              {lowestOverall > 0 && (
                <span className="text-price font-medium"> — desde {formatCLP(lowestOverall)}</span>
              )}
            </p>
          </div>
          <SortSelect />
        </div>
      </div>

      {productsWithPrices.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
          {productsWithPrices.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No hay fresas con precio disponible en este momento.
        </div>
      )}

      <section className="bg-card rounded-xl border border-border p-6 mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Fresas dentales: guía de precios en Chile
        </h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 max-w-3xl">
          <p>
            Las fresas dentales son instrumental rotatorio esencial para preparaciones cavitarias,
            tallados protésicos y acabado de restauraciones. En Chile, los precios varían
            significativamente entre proveedores para fresas de las mismas especificaciones.
          </p>
          <p>
            DentalPrecios compara diariamente precios de fresas de diamante (grano fino, medio y grueso),
            fresas de carburo de tungsteno, fresas multilaminadas y piedras de acabado de marcas como
            Komet, Edenta, Microdont, SS White y Jota entre los principales proveedores dentales de Chile.
          </p>
          <p>
            Ya sea que busques fresas para turbina, contraángulo o pieza recta, para operatoria,
            prótesis o cirugía, esta comparativa te permite encontrar el mejor precio sin cotizar
            a cada proveedor por separado.
          </p>
        </div>
        <div className="mt-4">
          <Link
            href="/categorias/fresas-diamantes"
            className="text-sm text-primary hover:underline"
          >
            Ver catálogo completo de fresas dentales →
          </Link>
        </div>
      </section>
    </div>
  )
}
