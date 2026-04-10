import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCLP, aggregateLatestPrices, buildProductsWithPrices } from '@/lib/queries/products'
import ProductCard from '@/components/ProductCard'
import SortSelect from '@/components/filters/SortSelect'

const BASE_URL = 'https://www.dentalprecios.cl'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'anestesia')
    .single()

  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', category?.id || '')

  const productCount = count || 0
  const title = 'Anestesia Dental Precio Chile — Carpules y Tubos'
  const description = `Compara precios de carpules de anestesia en Chile: lidocaína, articaína, mepivacaína entre los principales proveedores dentales. Datos reales.`

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/precios/anestesia` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/precios/anestesia`,
      siteName: 'DentalPrecios',
      locale: 'es_CL',
      type: 'website',
    },
    robots: { index: true, follow: true },
  }
}

export default async function AnestesiaPreciosPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const { sort = 'price_asc' } = await searchParams
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', 'anestesia')
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
    name: 'Anestesia Dental — Carpules y tubos anestésicos',
    description: `Comparativa de precios de ${productsWithPrices.length} anestésicos dentales en Chile entre +70 proveedores. Lidocaína, articaína, mepivacaína y más.`,
    category: 'Anestesia dental',
    brand: { '@type': 'Brand', name: 'Septodont, DFL, Zeyco, Novocol, Maver' },
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
          }))
      ),
    },
  })

  const itemListSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Precios de Anestesia Dental en Chile',
    description: `Comparativa de precios de ${productsWithPrices.length} anestésicos entre proveedores dentales en Chile.`,
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
        name: '¿Cuánto cuesta la anestesia dental en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `El precio de carpules de anestesia dental en Chile varía entre ${formatCLP(lowestOverall)} y ${formatCLP(highestOverall)} CLP dependiendo del proveedor, principio activo y marca. DentalPrecios compara ${productsWithPrices.length} anestésicos de ${supplierIds.size} proveedores con precios actualizados diariamente.`,
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué anestesia dental usan los dentistas en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Los anestésicos más usados en Chile son lidocaína 2% con epinefrina (Septodont, DFL, Zeyco), articaína 4% con epinefrina (Septanest, DFL Articaína) y mepivacaína 3% sin vasoconstrictor (Mepisv, Scandonest). La elección depende del procedimiento clínico y la duración de anestesia requerida.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Dónde comprar anestesia dental más barata en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Los precios de anestesia dental varían significativamente entre proveedores. DentalPrecios compara precios de ${supplierIds.size} proveedores dentales chilenos en un solo lugar para que encuentres el mejor precio sin cotizar a cada uno por separado.`,
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
      { '@type': 'ListItem', position: 3, name: 'Anestesia Dental', item: `${BASE_URL}/precios/anestesia` },
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
        <Link href="/categorias/anestesia" className="hover:text-foreground">Anestesia</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Precios</span>
      </nav>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Precios de Anestesia Dental en Chile
            </h1>
            <p className="text-muted-foreground mt-2">
              {productsWithPrices.length} anestésicos comparados entre {supplierIds.size} proveedores
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
          No hay anestésicos con precio disponible en este momento.
        </div>
      )}

      <section className="bg-card rounded-xl border border-border p-6 mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Anestesia dental: guía de precios en Chile
        </h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 max-w-3xl">
          <p>
            La anestesia dental es el insumo de mayor rotación en la consulta odontológica. En Chile,
            los precios de carpules varían hasta un 65% entre proveedores para el mismo principio activo
            y concentración, lo que representa un ahorro significativo a escala anual.
          </p>
          <p>
            DentalPrecios compara diariamente precios de lidocaína 2% con epinefrina (Septodont, DFL,
            Zeyco, Maver), articaína 4% (Septanest, DFL Articaína), mepivacaína 3% (Mepisv, Scandonest)
            y prilocaína entre los principales proveedores dentales de Chile. Cada precio incluye
            disponibilidad y enlace directo al proveedor.
          </p>
          <p>
            Ya sea que busques carpules de lidocaína para procedimientos de rutina, articaína para
            cirugías más largas o mepivacaína sin vasoconstrictor para pacientes con contraindicaciones,
            esta comparativa te permite encontrar el mejor precio sin cotizar a cada proveedor.
          </p>
        </div>
        <div className="mt-4">
          <Link
            href="/categorias/anestesia"
            className="text-sm text-primary hover:underline"
          >
            Ver catálogo completo de anestesia dental →
          </Link>
        </div>
      </section>
    </div>
  )
}
