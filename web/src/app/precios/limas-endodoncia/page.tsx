import Link from 'next/link'
import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { formatCLP, aggregateLatestPrices, buildProductsWithPrices } from '@/lib/queries/products'
import { OFFER_SHIPPING_DETAILS_CL, MERCHANT_RETURN_POLICY_CL } from '@/lib/schema-offer-policies'
import ProductCard from '@/components/ProductCard'
import SortSelect from '@/components/filters/SortSelect'

const BASE_URL = 'https://www.dentalprecios.cl'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Limas de Endodoncia: Precio en Chile 2026 — Compara Sistemas',
  description:
    'Precios de limas de endodoncia en Chile: ProTaper, WaveOne, Reciproc, HyFlex, K-files, Hedstrom. Compara sistemas rotatorios, reciprocantes y manuales entre distribuidores.',
  alternates: { canonical: `${BASE_URL}/precios/limas-endodoncia` },
  openGraph: {
    title: 'Limas de Endodoncia: Precio en Chile 2026 — Compara Sistemas',
    description:
      'Precios de limas rotatorias, reciprocantes y manuales en Chile. ProTaper, WaveOne, Reciproc, HyFlex, K-files, Hedstrom comparados entre distribuidores.',
    url: `${BASE_URL}/precios/limas-endodoncia`,
    siteName: 'DentalPrecios',
    locale: 'es_CL',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

type LimaGroupKey = 'protaper' | 'waveone' | 'reciproc' | 'hyflex' | 'race' | 'manuales' | 'otras'

interface LimaGroup {
  key: LimaGroupKey
  label: string
  description: string
  matches: (name: string) => boolean
}

const LIMA_GROUPS: LimaGroup[] = [
  {
    key: 'protaper',
    label: 'ProTaper (Universal / Gold)',
    description:
      'Sistema rotatorio secuencial de Dentsply Maillefer. Universal (NiTi convencional) y Gold (tratamiento termico).',
    matches: (n) => /protaper/i.test(n),
  },
  {
    key: 'waveone',
    label: 'WaveOne Gold',
    description:
      'Sistema reciprocante de lima unica (Small, Primary, Medium, Large). Aleacion Gold, cinematica reciprocante.',
    matches: (n) => /waveone|wave\s*one/i.test(n),
  },
  {
    key: 'reciproc',
    label: 'Reciproc (Blue)',
    description:
      'Reciprocante de lima unica de VDW, aleacion M-Wire tratada (Blue). Alternativa directa a WaveOne.',
    matches: (n) => /reciproc/i.test(n),
  },
  {
    key: 'hyflex',
    label: 'HyFlex (CM / EDM)',
    description:
      'Controlled Memory de Coltene. EDM fabricadas por electroerosion - maxima resistencia a fatiga ciclica.',
    matches: (n) => /hyflex|hy-?flex/i.test(n),
  },
  {
    key: 'race',
    label: 'RaCe EVO / Mtwo',
    description:
      'Sistemas suizos y europeos alternativos: RaCe EVO (FKG) y Mtwo (VDW) - disenos single-length o secuenciales.',
    matches: (n) => /\brace\b|mtwo|m-two/i.test(n),
  },
  {
    key: 'manuales',
    label: 'Limas manuales (K-files, Hedstrom)',
    description:
      'Limas de acero inoxidable. K-file para cateterismo y glide path; Hedstrom para ensanche manual.',
    matches: (n) =>
      /k-?file|k\s*file|hedstrom|hedström|hedstroem|tipo\s*k|lima\s*manual|acero\s*inox/i.test(n),
  },
  {
    key: 'otras',
    label: 'Otras limas y accesorios',
    description:
      'Limas niti genericas, sets surtidos, limas de retratamiento y accesorios especificos.',
    matches: (n) => /lima|file/i.test(n),
  },
]

function classifyLima(name: string): LimaGroupKey | null {
  for (const g of LIMA_GROUPS) if (g.matches(name)) return g.key
  return null
}

export default async function LimasEndodonciaPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; sistema?: string }>
}) {
  const { sort = 'price_asc', sistema } = await searchParams
  const supabase = createPublicClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', 'endodoncia')
    .single()

  if (!category) return null

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', category.id)
    .order('name')

  const limaProducts = (products || []).filter((p) => classifyLima(p.name))
  const productIds = limaProducts.map((p) => p.id)

  const { data: allPrices } = await supabase
    .from('prices')
    .select('*, supplier:suppliers(*)')
    .in('product_id', productIds)
    .order('scraped_at', { ascending: false })

  const filteredPrices = (allPrices || []).filter((p: any) => p.supplier?.active !== false)
  const latestPrices = aggregateLatestPrices(filteredPrices)
  const productsWithPrices = buildProductsWithPrices(limaProducts, latestPrices)
    .filter((p) => p.lowest_price > 0)

  const productsWithGroup = productsWithPrices.map((p) => ({
    ...p,
    lima_group: classifyLima(p.name),
  }))

  const activeGroup = LIMA_GROUPS.find((g) => g.key === sistema)
  const filteredProducts = activeGroup
    ? productsWithGroup.filter((p) => p.lima_group === activeGroup.key)
    : productsWithGroup

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

  const groupAggregates = LIMA_GROUPS.map((g) => {
    const members = productsWithGroup.filter((p) => p.lima_group === g.key)
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
    key: LimaGroupKey
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

  // JSON-LD: server-built from trusted DB data (standard Next.js pattern)
  const productSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Limas de Endodoncia — Sistemas rotatorios, reciprocantes y manuales',
    description: `Comparativa de precios de ${productsWithPrices.length} limas de endodoncia en Chile entre distribuidores activos: ProTaper, WaveOne, Reciproc, HyFlex, RaCe EVO, K-files y Hedstrom.`,
    category: 'Limas de endodoncia',
    brand: {
      '@type': 'Brand',
      name: 'Dentsply Maillefer, VDW, FKG Dentaire, Coltene, Kerr, Meta Biomed',
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
    name: 'Precios de Limas de Endodoncia en Chile',
    description: `Comparativa de ${productsWithPrices.length} limas de endodoncia entre distribuidores chilenos.`,
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
        name: '¿Cuánto cuesta un set de limas de endodoncia en Chile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Un set de limas rotatorias en Chile cuesta entre $45.000 y $210.000 CLP dependiendo del sistema (ProTaper Universal, Gold, WaveOne Gold, Reciproc Blue, HyFlex EDM) y del distribuidor. Las limas manuales K-file y Hedstrom están entre $3.500 y $13.500 por set de 6. En DentalPrecios comparamos ${productsWithPrices.length} referencias entre ${supplierIds.size} distribuidores activos, con actualizacion diaria.`,
        },
      },
      {
        '@type': 'Question',
        name: '¿Cuál es la diferencia entre ProTaper Universal y ProTaper Gold?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'ProTaper Universal usa NiTi convencional; ProTaper Gold usa NiTi tratado termicamente (aleacion Gold). La diferencia clinica es significativa: las Gold toleran mayor angulacion antes de fractura ciclica, mantienen memoria de forma pre-curvada y son considerablemente mas flexibles en conductos curvos. Para conductos rectos a moderadamente curvos ambas funcionan; para molares inferiores con curvaturas severas, Gold reduce el riesgo de fractura intraconducto.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué es mejor: sistema rotatorio o reciprocante?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Los sistemas rotatorios (ProTaper Gold, HyFlex) preservan la tecnica clasica secuencial con varias limas por caso. Los reciprocantes (WaveOne Gold, Reciproc Blue) usan una sola lima y rotacion alternada, reduciendo la acumulacion de estres ciclico. La evidencia clinica muestra menor tasa de fractura con reciprocantes Gold. Para clinicas con alto volumen, los reciprocantes aceleran el flujo; para operadores que prefieren control incremental, los rotatorios siguen siendo la opcion mas versatil. No hay un mejor absoluto: depende del volumen, tipo de caso y preferencia del operador.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué significan las aleaciones M-Wire, CM, Gold y Blue?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Son tratamientos termicos aplicados a la aleacion NiTi base. M-Wire (Dentsply) aumenta ~400% la resistencia a fatiga ciclica vs NiTi convencional. Controlled Memory (CM, usado en HyFlex) tiene baja dureza Vickers y memoria parcial - se puede pre-curvar manualmente, ideal para curvaturas. Gold (Dentsply) y Blue (VDW) son tratamientos termicos adicionales post-manufactura que combinan alta flexibilidad con memoria de forma superior. La eleccion depende de la anatomia del conducto.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Por qué varían tanto los precios de limas entre distribuidores?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Entre distribuidores en Chile documentamos diferencias superiores al 100% para el mismo codigo de referencia oficial. Un set de ProTaper Gold puede costar $65.000 en un distribuidor y $155.000 en otro por el mismo producto Dentsply. Las causas son: descuentos por volumen con fabricante, estrategias de margen por segmento, stock heredado y acuerdos de exclusividad. Para una clinica activa con 15+ casos semanales, comparar antes de pedir representa un ahorro acumulado minimo de $1.500.000 CLP anuales solo en instrumental rotatorio.',
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
      { '@type': 'ListItem', position: 3, name: 'Limas de Endodoncia', item: `${BASE_URL}/precios/limas-endodoncia` },
    ],
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbSchema }} />

      <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-1 min-w-0">
        <Link href="/" className="hover:text-foreground shrink-0">Inicio</Link>
        <span className="shrink-0">/</span>
        <Link href="/categorias" className="hover:text-foreground shrink-0">Categorías</Link>
        <span className="shrink-0">/</span>
        <Link href="/categorias/endodoncia" className="hover:text-foreground shrink-0">Endodoncia</Link>
        <span className="shrink-0">/</span>
        <span className="text-foreground truncate">Limas</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Limas de Endodoncia: Precio en Chile — Compara Sistemas
        </h1>
        <p className="text-muted-foreground mt-2">
          {productsWithPrices.length} limas comparadas entre {supplierIds.size} distribuidores
          {lowestOverall > 0 && (
            <span className="text-price font-medium"> — desde {formatCLP(lowestOverall)}</span>
          )}
        </p>
      </div>

      {groupAggregates.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-3">Rangos de precio por sistema</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border bg-muted/30">
                  <th className="px-4 py-3 font-semibold">Sistema</th>
                  <th className="px-4 py-3 font-semibold text-right">Referencias</th>
                  <th className="px-4 py-3 font-semibold text-right">Rango CLP</th>
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
                      {formatCLP(g.lowest)} — {formatCLP(g.highest)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/precios/limas-endodoncia?sistema=${g.key}`}
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

      {activeGroup && (
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 text-primary px-3 py-1 text-sm">
            Sistema: {activeGroup.label}
            <Link href="/precios/limas-endodoncia" className="text-xs hover:underline">quitar ×</Link>
          </span>
          <span className="text-sm text-muted-foreground">{sorted.length} productos</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {activeGroup ? activeGroup.label : 'Limas disponibles'}
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
          No hay limas con precio disponible en esta selección.
        </div>
      )}

      <section className="bg-card rounded-xl border border-border p-6 mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Cómo elegir el sistema de limas correcto
        </h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 max-w-3xl">
          <p>
            La elección de lima en endodoncia es una decisión clínica con consecuencias directas:
            riesgo de fractura intraconducto, calidad de la preparación apical, tiempo operatorio y
            costo por tratamiento. En Chile hay disponibilidad completa de los sistemas más usados a
            nivel mundial — la decisión real es de preferencia clínica y volumen, no de acceso.
          </p>
          <p>
            <strong className="text-foreground">Limas manuales</strong> (K-file, Hedström) no son
            obsoletas — son imprescindibles para el cateterismo inicial, el glide path manual y el
            manejo de conductos calcificados o con curvaturas severas donde la rigidez del rotatorio
            aumenta el riesgo. Todo set profesional parte por un buen stock de limas manuales.
          </p>
          <p>
            <strong className="text-foreground">Sistemas rotatorios</strong> (ProTaper Gold, HyFlex
            EDM, RaCe EVO) dominan la conformación del tercio medio y apical. Su ventaja es
            flexibilidad y corte eficiente; su limitación es que exigen motor con control de torque
            y glide path manual previo en conductos curvos.
          </p>
          <p>
            <strong className="text-foreground">Sistemas reciprocantes</strong> (WaveOne Gold,
            Reciproc Blue) usan una sola lima y cinemática alternada que reduce la acumulación de
            estrés cíclico. La tasa de fractura reportada es menor que sistemas rotatorios
            tradicionales. Para clínicas con alto volumen de endodoncia, la eficiencia por caso
            justifica el cambio.
          </p>
          <p>
            La guía clínica completa con comparación por aleación, indicación y precio por sistema
            está en{' '}
            <Link
              href="/blog/limas-endodoncia-tipos-usos-chile-2026"
              className="text-primary hover:underline"
            >
              Limas de endodoncia: tipos, usos y precios en Chile 2026
            </Link>
            .
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/blog/limas-endodoncia-tipos-usos-chile-2026"
            className="text-sm text-primary hover:underline"
          >
            Guía clínica: tipos de limas →
          </Link>
          <Link
            href="/categorias/endodoncia"
            className="text-sm text-primary hover:underline"
          >
            Ver catálogo completo de endodoncia →
          </Link>
          <Link
            href="/precios/implantes-dentales"
            className="text-sm text-primary hover:underline"
          >
            Precios de implantes dentales →
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
