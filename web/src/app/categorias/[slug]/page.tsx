import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { aggregateLatestPrices, buildProductsWithPrices } from '@/lib/queries/products'
import ProductCard from '@/components/ProductCard'
import FilterPanel from '@/components/filters/FilterPanel'
import SortSelect from '@/components/filters/SortSelect'

const BASE_URL = 'https://www.dentalprecios.cl'

const CATEGORY_INTROS: Record<string, string> = {
  'acabado-pulido':
    'Encuentra discos de pulido, copas, puntas de silicona, tiras de acabado y pastas de pulir de marcas como Shofu, 3M, Kerr y TDV. Compara precios de sistemas de acabado y pulido para resinas y cerámicas entre más de 70 proveedores dentales en Chile. En DentalPrecios reunimos todo lo que necesitas para lograr restauraciones con brillo y lisura superficial óptima, desde kits de contorneado hasta compuestos diamantados para el pulido final.',
  'anestesia':
    'Compara precios de anestésicos dentales como lidocaína, articaína, mepivacaína y prilocaína de marcas como Septodont, DFL y Zeyco. Encuentra carpules, agujas dentales y sistemas de anestesia computarizada en más de 70 proveedores de Chile. DentalPrecios te ayuda a encontrar el mejor precio en anestesia local, anestesia tópica y todos los insumos necesarios para un procedimiento indoloro.',
  'cad-cam':
    'Explora bloques de fresado, discos de zirconia, escáneres intraorales y accesorios CAD/CAM de marcas como Ivoclar, VITA, Sirona y Amann Girrbach. DentalPrecios compara precios de materiales e insumos para odontología digital entre más de 70 proveedores en Chile. Encuentra bloques de disilicato de litio, PMMA, resinas para impresión 3D y todo lo necesario para tu flujo de trabajo digital.',
  'cementos-adhesivos':
    'Compara precios de cementos de resina, cementos de ionómero de vidrio, adhesivos dentales y sistemas de cementación de marcas como 3M RelyX, Ivoclar Variolink, Kerr y FGM. En DentalPrecios reunimos más de 70 proveedores dentales de Chile para que encuentres el mejor precio en cementos definitivos, provisionales y adhesivos universales para tu consulta.',
  'ceras':
    'Encuentra ceras para modelar, ceras de mordida, ceras utility y ceras para colado de marcas como Yeti Dental, Renfert, Lysanda y Technowax. DentalPrecios compara precios de ceras dentales para laboratorio y clínica entre más de 70 proveedores en Chile. Accede a ceras de base plate, ceras de inmersión y ceras para patrones de todo tipo al mejor precio.',
  'cirugia':
    'Compara precios de fórceps, elevadores, suturas, bisturís, membranas de colágeno y kits de cirugía oral de marcas como Hu-Friedy, Medesy, BioHorizons y Geistlich. DentalPrecios reúne más de 70 proveedores dentales en Chile para que encuentres instrumental y materiales de cirugía bucal, implantología y regeneración ósea al mejor precio disponible.',
  'control-infecciones-clinico':
    'Encuentra desinfectantes de superficie, soluciones enzimáticas, esterilizadores, indicadores biológicos y barreras de protección de marcas como Zeta, Cidex, Crosstex y 3M. Compara precios de productos de control de infecciones para la clínica dental entre más de 70 proveedores en Chile. DentalPrecios te ayuda a mantener tu consulta segura y cumplir con los protocolos de bioseguridad.',
  'control-infecciones-personal':
    'Compara precios de guantes de nitrilo, mascarillas, protectores faciales, gorros desechables y delantales de marcas como Cranberry, Supermax y Medicom. DentalPrecios reúne más de 70 proveedores dentales en Chile para que encuentres equipos de protección personal (EPP) al mejor precio. Protege a tu equipo con insumos de bioseguridad certificados para la práctica odontológica.',
  'coronas-cofias':
    'Encuentra coronas preformadas de acero, coronas de celuloide, cofias de acetato y coronas estéticas pediátricas de marcas como 3M, NuSmile y TDV. Compara precios de coronas dentales temporales y definitivas entre más de 70 proveedores en Chile. DentalPrecios te ayuda a acceder a soluciones protésicas rápidas y de calidad para odontopediatría y rehabilitación oral.',
  'desechables':
    'Compara precios de vasos desechables, eyectores de saliva, baberos, puntas de jeringa triple, rollos de algodón y más. Encuentra insumos desechables de marcas como Cotisen, Premium Plus y TPC entre más de 70 proveedores dentales en Chile. DentalPrecios reúne todos los productos de uso diario que tu consulta necesita para que compares y ahorres en cada compra.',
  'endodoncia':
    'Encuentra limas endodónticas, conos de gutapercha, selladores de conducto, localizadores de ápice y sistemas rotatorios de marcas como Dentsply Maillefer, VDW, Meta Biomed y FKG. DentalPrecios compara precios de insumos de endodoncia entre más de 70 proveedores en Chile. Accede a limas manuales, limas NiTi, puntas de papel y todo lo que necesitas para el tratamiento de conductos.',
  'equipamiento':
    'Compara precios de sillones dentales, unidades de trabajo, compresores, autoclaves, lámparas de fotocurado y ultrasonido de marcas como NSK, Woodpecker, Gnatus y KaVo. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres equipamiento odontológico al mejor precio. Desde unidades completas hasta accesorios y repuestos para equipar tu consulta.',
  'evacuacion':
    'Encuentra puntas de aspiración quirúrgica, cánulas de succión, eyectores desechables y adaptadores de evacuación de marcas como Medicom, Premium Plus y TPC. Compara precios de sistemas de evacuación dental entre más de 70 proveedores en Chile. DentalPrecios te ayuda a mantener un campo operatorio limpio con los mejores insumos de succión y aspiración.',
  'fresas-diamantes':
    'Compara precios de fresas de diamante, fresas de carburo de tungsteno, piedras de Arkansas y fresas multilaminadas de marcas como Komet, Microdont, SS White y Jota. DentalPrecios reúne más de 70 proveedores dentales en Chile para que encuentres fresas para turbina, contraángulo y pieza recta al mejor precio. Fresas de grano fino, medio y grueso para cada procedimiento.',
  'goma-dique':
    'Encuentra gomas de dique, arcos de Young, clamps, porta-clamps y perforadoras de marcas como Coltene Hygenic, Hu-Friedy y Sanctuary. Compara precios de kits de aislamiento absoluto entre más de 70 proveedores dentales en Chile. DentalPrecios te ayuda a equipar tu consulta con todo lo necesario para un aislamiento seguro y eficiente en operatoria y endodoncia.',
  'implantes':
    'Compara precios de implantes dentales, pilares protésicos, tornillos, kits de regeneración y componentes protésicos de marcas como Straumann, Neodent, MIS, Bionnovation y Conexão. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres sistemas de implantología al mejor precio. Accede a implantes cónicos, cilíndricos, pilares de titanio y toda la gama de componentes.',
  'instrumental':
    'Encuentra espejos dentales, sondas, exploradores, curetas, espátulas y kits de diagnóstico de marcas como Hu-Friedy, Medesy y YDM. Compara precios de instrumental odontológico entre más de 70 proveedores en Chile. DentalPrecios te ofrece la mayor variedad de instrumentos manuales para operatoria, periodoncia, cirugía y diagnóstico al mejor precio disponible.',
  'jeringas-agujas':
    'Compara precios de jeringas carpule, agujas dentales cortas y largas, y jeringas descartables de marcas como Septodont, DFL, Nipro y BD. Encuentra insumos para anestesia e irrigación entre más de 70 proveedores dentales en Chile. DentalPrecios te ayuda a abastecerte de jeringas y agujas de calidad para cada procedimiento clínico.',
  'laboratorio':
    'Encuentra yesos dentales, revestimientos, aleaciones, siliconas de duplicar, articuladores y materiales de vaciado de marcas como Zhermack, Renfert, GC y Yeti Dental. DentalPrecios compara precios de insumos de laboratorio dental entre más de 70 proveedores en Chile. Accede a materiales para prótesis fija, removible y ortodoncia con los mejores precios del mercado.',
  'lupas-lamparas':
    'Compara precios de lupas binoculares, lámparas LED frontales y sistemas de magnificación de marcas como Zumax, Univet, Orascoptic y Designs for Vision. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres equipos de magnificación y iluminación al mejor precio. Mejora la ergonomía y precisión de tus tratamientos con lupas de 2.5x a 6x aumentos.',
  'materiales-impresion':
    'Encuentra alginatos, siliconas de adición, siliconas de condensación, poliéteres y cubetas de impresión de marcas como Zhermack, 3M, Coltene y GC. DentalPrecios compara precios de materiales de impresión dental entre más de 70 proveedores en Chile. Accede a materiales de impresión de alta precisión para prótesis fija, removible e implantes al mejor precio.',
  'materiales-retraccion':
    'Compara precios de hilos retractores, pastas de retracción y capsulas hemostáticas de marcas como Ultradent Ultrapak, 3M, Roeko y Sure Cord. Encuentra materiales de retracción gingival entre más de 70 proveedores dentales en Chile. DentalPrecios te ayuda a conseguir los mejores precios en insumos para manejo de tejidos blandos y toma de impresiones precisas.',
  'matrices-cunas':
    'Encuentra matrices seccionales, matrices circunferenciales, cuñas de madera, cuñas plásticas y porta-matrices de marcas como TDV Unimatrix, Palodent, Garrison y Tofflemire. DentalPrecios compara precios de sistemas de matrices y cuñas entre más de 70 proveedores en Chile. Consigue todo lo que necesitas para restauraciones proximales con un contorno anatómico óptimo.',
  'miscelaneos':
    'Compara precios de artículos varios para la consulta dental: micro-aplicadores, cucharillas de medición, papel de articular, bloques de mezcla, cuñas y más. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres todos los insumos misceláneos que tu clínica necesita al mejor precio. Desde organizadores hasta accesorios complementarios para el día a día.',
  'estetica':
    'Encuentra blanqueamiento dental, carillas de composite, sistemas de color y accesorios de odontología estética de marcas como Ultradent, FGM Whiteness, Ivoclar y Tokuyama. Compara precios de productos de estética dental entre más de 70 proveedores en Chile. DentalPrecios te ayuda a acceder a geles de peróxido, guías de color, diques líquidos y todo lo necesario para tratamientos estéticos.',
  'ortodoncia':
    'Compara precios de brackets metálicos, brackets estéticos, alambres NiTi, elásticos, tubos y bandas de marcas como 3M Unitek, Morelli, Ormco y American Orthodontics. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres materiales de ortodoncia al mejor precio. Accede a brackets autoligantes, alineadores, ceras de ortodoncia y todos los insumos para tu práctica.',
  'pernos-postes':
    'Encuentra postes de fibra de vidrio, postes de titanio, postes prefabricados y sistemas de reconstrucción de muñón de marcas como Angelus, FGM, Maquira y 3M. DentalPrecios compara precios de pernos y postes dentales entre más de 70 proveedores en Chile. Accede a postes cónicos, cilíndricos y sistemas de cementación para rehabilitación de dientes tratados endodónticamente.',
  'piezas-de-mano':
    'Compara precios de turbinas dentales, contraángulos, piezas de mano rectas, micromotores y accesorios de marcas como NSK, KaVo, W&H y Bien Air. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres piezas de mano de alta y baja velocidad al mejor precio. Desde turbinas con luz LED hasta contraángulos reductores para implantología.',
  'preventivos':
    'Encuentra flúor barniz, sellantes de fosas y fisuras, pastas profilácticas, cepillos profilácticos y enjuagues de marcas como Colgate, 3M Clinpro, Ivoclar Fluor Protector y FGM. DentalPrecios compara precios de productos preventivos entre más de 70 proveedores en Chile. Accede a materiales de prevención dental para niños y adultos con los mejores precios del mercado.',
  'radiologia':
    'Compara precios de películas radiográficas, sensores digitales, líquidos reveladores, delantales plomados y posicionadores de marcas como Carestream, Agfa, Fuji y Maquira. DentalPrecios reúne más de 70 proveedores en Chile para que encuentres insumos de radiología dental al mejor precio. Desde radiografías periapicales hasta sistemas de imagenología digital.',
  'resinas-compuestas':
    'Encuentra resinas compuestas, composites fluidos, resinas bulk fill y sistemas adhesivos de marcas como 3M Filtek, Ivoclar Tetric, Kerr Herculite, FGM y Tokuyama Estelite. DentalPrecios compara precios de resinas dentales entre más de 70 proveedores en Chile. Accede a composites nanohíbridos, microhíbridos y resinas de alta estética para restauraciones directas al mejor precio.',
}

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
              {CATEGORY_INTROS[slug] && (
                <p className="text-sm text-muted-foreground mt-3 max-w-3xl leading-relaxed">
                  {CATEGORY_INTROS[slug]}
                </p>
              )}
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
