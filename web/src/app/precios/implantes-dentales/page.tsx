import Link from 'next/link'
import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { formatCLP, fetchLatestPricesForProducts, buildProductsWithPrices } from '@/lib/queries/products'
import { OFFER_SHIPPING_DETAILS_CL, MERCHANT_RETURN_POLICY_CL } from '@/lib/schema-offer-policies'
import ProductCard from '@/components/ProductCard'
import SortSelect from '@/components/filters/SortSelect'

const BASE_URL = 'https://www.dentalprecios.cl'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Implantes Dentales: Precios Chile 2026',
  description:
    '¿Cuánto cuesta un implante dental en Chile? Compara precios de implantes, pilares protésicos, kits quirúrgicos y biomateriales entre distribuidores chilenos. Actualizado abril 2026.',
  alternates: { canonical: `${BASE_URL}/precios/implantes-dentales` },
  openGraph: {
    title: 'Implantes Dentales: Precios Chile 2026',
    description:
      '¿Cuánto cuesta un implante dental en Chile? Compara precios de implantes, pilares, kits quirúrgicos y biomateriales entre distribuidores chilenos.',
    url: `${BASE_URL}/precios/implantes-dentales`,
    siteName: 'DentalPrecios',
    locale: 'es_CL',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

type ComponentGroupKey =
  | 'pilares'
  | 'fixtures'
  | 'fresas'
  | 'biomateriales'
  | 'kits'
  | 'tornillos'

interface ComponentGroup {
  key: ComponentGroupKey
  label: string
  description: string
  matches: (name: string) => boolean
}

const COMPONENT_GROUPS: ComponentGroup[] = [
  {
    key: 'pilares',
    label: 'Pilares protésicos (abutments)',
    description:
      'Pilares rectos, angulados, multiunit y aditamentos de transferencia. El componente protésico intermedio entre el implante y la corona.',
    matches: (n) => /pilar|abutment|aditamento\s*protesico|multiunit|muab|transfer/i.test(n),
  },
  {
    key: 'fixtures',
    label: 'Implantes (fixtures)',
    description:
      'Cuerpos de implante quirúrgicos, titanio o titanio-zirconio, cónicos o cilíndricos, diferentes diámetros y longitudes.',
    matches: (n) =>
      /implante/i.test(n) && /corto|largo|conic|cilindric|bone\s*level|tissue\s*level|fixture/i.test(n),
  },
  {
    key: 'kits',
    label: 'Kits e instrumental quirúrgico',
    description:
      'Cajas quirúrgicas completas, motores de implantología y sistemas de torque. Inversión única por práctica.',
    matches: (n) => /kit\s*quirurg|caja\s*quirurg|motor|torque|piezo|guiada/i.test(n),
  },
  {
    key: 'fresas',
    label: 'Fresas y brocas quirúrgicas',
    description:
      'Fresas de osteotomía (lanza, twist, piloto, escalonadas) y brocas específicas por sistema. Consumibles de vida útil limitada.',
    matches: (n) => /fresa|broca|drill/i.test(n),
  },
  {
    key: 'biomateriales',
    label: 'Biomateriales y regeneración ósea',
    description:
      'Sustitutos óseos xenógenos y aloplásticos, membranas colágeno y reabsorbibles, matrices para ROG y elevación de seno.',
    matches: (n) => /injerto|graft|membrana|bio-?oss|hueso|regeneracion|rog|matriz|colageno/i.test(n),
  },
  {
    key: 'tornillos',
    label: 'Tornillos de fijación y prótesis',
    description:
      'Tornillos protésicos, de cobertura, de cicatrización y de fijación. Piezas pequeñas, gran impacto en el flujo.',
    matches: (n) => /tornillo|screw|fijacion|cicatrizacion/i.test(n),
  },
]

function classifyComponent(name: string): ComponentGroupKey | null {
  for (const g of COMPONENT_GROUPS) if (g.matches(name)) return g.key
  return null
}

export default async function ImplantesPreciosPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; grupo?: string }>
}) {
  const { sort = 'price_asc', grupo } = await searchParams
  const supabase = createPublicClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', 'implantes')
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
  const productsWithPrices = buildProductsWithPrices(products || [], latestPrices)
    .filter((p) => p.lowest_price > 0)

  // Tag each product with its component group for filtering and aggregation
  const productsWithGroup = productsWithPrices.map((p) => ({
    ...p,
    component_group: classifyComponent(p.name),
  }))

  // Apply optional grupo filter
  const activeGroup = COMPONENT_GROUPS.find((g) => g.key === grupo)
  const filteredProducts = activeGroup
    ? productsWithGroup.filter((p) => p.component_group === activeGroup.key)
    : productsWithGroup

  // Sort
  const sorted = [...filteredProducts]
  switch (sort) {
    case 'price_asc':
      sorted.sort((a, b) => a.lowest_price - b.lowest_price)
      break
    case 'price_desc':
      sorted.sort((a, b) => b.lowest_price - a.lowest_price)
      break
    case 'stores':
      sorted.sort((a, b) => b.store_count - a.store_count)
      break
    case 'name':
    default:
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
  }

  // Component-level aggregates for the summary table
  const groupAggregates = COMPONENT_GROUPS.map((g) => {
    const members = productsWithGroup.filter((p) => p.component_group === g.key)
    if (members.length === 0) return null
    const lo = Math.min(...members.map((m) => m.lowest_price))
    const hi = Math.max(...members.map((m) => m.highest_price || m.lowest_price))
    return {
      key: g.key,
      label: g.label,
      description: g.description,
      count: members.length,
      lowest: lo,
      highest: hi,
    }
  }).filter(Boolean) as Array<{
    key: ComponentGroupKey
    label: string
    description: string
    count: number
    lowest: number
    highest: number
  }>

  const supplierIds = new Set<string>()
  for (const p of productsWithPrices)
    for (const price of p.prices) if (price.supplier_id) supplierIds.add(price.supplier_id)

  const lowestOverall = productsWithPrices.length
    ? Math.min(...productsWithPrices.map((p) => p.lowest_price))
    : 0
  const highestOverall = productsWithPrices.length
    ? Math.max(...productsWithPrices.map((p) => p.highest_price || p.lowest_price))
    : 0
  const totalOffers = productsWithPrices.reduce((sum, p) => sum + p.store_count, 0)

  // JSON-LD structured data, server-built from trusted DB data, standard Next.js pattern
  const productSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Implantes Dentales: Sistemas e insumos de implantología',
    description: `Comparativa de precios de ${productsWithPrices.length} productos de implantología dental en Chile entre distribuidores activos: implantes, pilares protésicos, kits quirúrgicos, fresas, biomateriales y tornillos de fijación.`,
    category: 'Implantes dentales',
    brand: {
      '@type': 'Brand',
      name: 'Straumann, Nobel Biocare, Neodent, Hiossen, MegaGen, MIS, BioHorizons y más',
    },
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
          })),
      ),
    },
  })

  const itemListSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Precios de Implantes Dentales en Chile',
    description: `Comparativa de ${productsWithPrices.length} productos de implantología dental entre distribuidores chilenos.`,
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
        name: '¿Cuánto cuesta un implante dental en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `El precio de los componentes de un implante dental en Chile varía por marca, sistema y distribuidor. En DentalPrecios comparamos ${productsWithPrices.length} productos de implantología de ${supplierIds.size} distribuidores activos, con precios que van desde ${formatCLP(lowestOverall)} en componentes menores hasta kits quirúrgicos y equipamiento que superan el millón de pesos. Esta página muestra rangos reales actualizados diariamente, separados por tipo de componente: implantes (fixtures), pilares protésicos, kits quirúrgicos, fresas, biomateriales y tornillos.`,
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué cubre Fonasa en implantes dentales?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Fonasa no cubre implantes dentales dentro de sus prestaciones generales. El sistema de salud público chileno considera los implantes una prestación odontológica de especialidad no garantizada por GES. Los pacientes y clínicas compran los componentes directamente a distribuidores. Las isapres sí ofrecen planes con reembolso parcial en algunos casos. Esta página muestra los precios que pagan los profesionales por los componentes, no el costo final del tratamiento al paciente.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué marcas de implantes dentales hay en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Las principales marcas disponibles en Chile son: Straumann (Suiza, premium), Nobel Biocare (Suecia/EE.UU., premium), Neodent (Brasil, grupo Straumann, gama media), Hiossen (EE.UU./Corea del Sur, alto volumen; marca con la que Osstem Implant Co. opera en Chile), MegaGen (Corea, superficie SLA premium), MIS (Israel), BioHorizons (EE.UU.), BTI (España), S.I.N. (Brasil) y Adin (Israel). Cada una con distribuidores autorizados locales. Los precios varían significativamente entre sistemas, un implante premium puede costar 3-4 veces más que un sistema coreano o brasileño con literatura clínica comparable.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Cuál es la diferencia de precio entre un implante y un pilar protésico?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'El implante (fixture) es el tornillo de titanio que se inserta quirúrgicamente en el hueso; el pilar protésico (abutment) es la pieza intermedia sobre la que se cementa o atornilla la corona. Ambos son componentes separados que se facturan por separado. En Chile los pilares rectos estándar suelen partir en el rango de $9.000–$50.000 CLP según marca, mientras que los implantes como unidad completa varían entre $70.000 y más de $350.000 CLP dependiendo del sistema. Los pilares angulados, multiunit y personalizados (custom) elevan el costo adicional.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Por qué varían tanto los precios entre distribuidores?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Entre distribuidores en Chile hemos documentado diferencias superiores al 35% para el mismo código de referencia, misma marca y misma presentación. Las causas son: descuentos por volumen entre distribuidor y fabricante, estrategias de margen por segmento (especialistas vs. odontólogos generales), stock heredado de importaciones anteriores y acuerdos exclusivos de ciertas referencias. Para una clínica con alto volumen de implantología, la diferencia acumulada anual puede superar los $3–5 millones CLP solo en componentes.',
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
      { '@type': 'ListItem', position: 3, name: 'Implantes Dentales', item: `${BASE_URL}/precios/implantes-dentales` },
    ],
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbSchema }} />

      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-1 min-w-0">
        <Link href="/" className="hover:text-foreground shrink-0">Inicio</Link>
        <span className="shrink-0">/</span>
        <Link href="/categorias" className="hover:text-foreground shrink-0">Categorías</Link>
        <span className="shrink-0">/</span>
        <Link href="/categorias/implantes" className="hover:text-foreground shrink-0">Implantes</Link>
        <span className="shrink-0">/</span>
        <span className="text-foreground truncate">Precios</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Precio de Implantes Dentales en Chile: Comparador por Componente
            </h1>
            <p className="text-muted-foreground mt-2">
              {productsWithPrices.length} productos de implantología comparados entre {supplierIds.size} distribuidores activos
              {lowestOverall > 0 && (
                <span className="text-price font-medium">, desde {formatCLP(lowestOverall)}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Component summary table, hero of the page */}
      {groupAggregates.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Rangos de precio por componente
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border bg-muted/30">
                  <th className="px-4 py-3 font-semibold">Componente</th>
                  <th className="px-4 py-3 font-semibold text-right">Productos</th>
                  <th className="px-4 py-3 font-semibold text-right">Rango de precio (CLP)</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {groupAggregates.map((g) => (
                  <tr key={g.key} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{g.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{g.description}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{g.count}</td>
                    <td className="px-4 py-3 text-right text-foreground tabular-nums font-medium">
                      {formatCLP(g.lowest)}, {formatCLP(g.highest)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/precios/implantes-dentales?grupo=${g.key}`}
                        className="text-sm text-primary hover:underline whitespace-nowrap"
                      >
                        Ver {g.count} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Filter chip indicator */}
      {activeGroup && (
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 text-primary px-3 py-1 text-sm">
            Filtro: {activeGroup.label}
            <Link href="/precios/implantes-dentales" className="text-xs hover:underline">
              quitar ×
            </Link>
          </span>
          <span className="text-sm text-muted-foreground">{sorted.length} productos</span>
        </div>
      )}

      {/* Product grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {activeGroup ? activeGroup.label : 'Productos disponibles'}
        </h2>
        <SortSelect />
      </div>

      {sorted.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
          {sorted.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No hay productos con precio disponible en esta selección.
        </div>
      )}

      {/* SEO editorial, targets the cluster */}
      <section className="bg-card rounded-xl border border-border p-6 mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Implantes dentales: cómo entender los precios en Chile
        </h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 max-w-3xl">
          <p>
            Un tratamiento completo de implantología no es un producto único, es un sistema de
            componentes que se facturan por separado. Entender la estructura de precios antes de
            cotizar es la diferencia entre presupuestar correctamente al paciente y descubrir
            sobrecostos a mitad del plan quirúrgico.
          </p>
          <p>
            Los tres componentes centrales de todo implante, fixture (el tornillo de titanio que se
            inserta en el hueso), pilar protésico (abutment) y corona, se compran a distribuidores
            diferentes o en pedidos separados. A estos se suman los consumibles quirúrgicos (fresas,
            tornillos de cicatrización, transferentes) y, en casos con defecto óseo, los
            biomateriales de regeneración (xenoinjertos, membranas reabsorbibles, matrices).
          </p>
          <p>
            El rango de precio varía significativamente entre sistemas. Marcas premium como
            Straumann y Nobel Biocare se posicionan en el extremo superior, con fixtures que parten
            sobre los $150.000 CLP y pilares protésicos sobre los $80.000 CLP. Marcas coreanas
            (Hiossen, MegaGen) y brasileñas (Neodent, S.I.N.) ofrecen alternativas entre 40
            y 60% más económicas con literatura clínica comparable a mediano plazo.
          </p>
          <p>
            La guía clínica completa y una comparación marca por marca está en nuestro artículo de{' '}
            <Link href="/blog/implantes-dentales-precio-chile-2026" className="text-primary hover:underline">
              precios de implantes dentales en Chile 2026
            </Link>
            , que detalla los 13 sistemas activos en el mercado, sus líneas de producto y rangos de
            precio por componente.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/blog/implantes-dentales-precio-chile-2026"
            className="text-sm text-primary hover:underline"
          >
            Guía: precios de implantes Chile 2026 →
          </Link>
          <Link
            href="/categorias/implantes"
            className="text-sm text-primary hover:underline"
          >
            Ver catálogo completo de implantes →
          </Link>
          <Link
            href="/categorias/cirugia"
            className="text-sm text-primary hover:underline"
          >
            Instrumental y cirugía dental →
          </Link>
          <Link
            href="/precios/resina-compuesta"
            className="text-sm text-primary hover:underline"
          >
            Precios de resinas compuestas →
          </Link>
        </div>
      </section>
    </div>
  )
}
