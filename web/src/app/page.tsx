import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { aggregateLatestPrices, buildProductsWithPrices } from '@/lib/queries/products'
import HeroSection from '@/components/home/HeroSection'
import TrendingProducts from '@/components/home/TrendingProducts'
import SupplierShowcase from '@/components/home/SupplierShowcase'
import HowItWorks from '@/components/home/HowItWorks'
import PracticeTypes from '@/components/home/PracticeTypes'
import { getCategoryIcon } from '@/components/icons/CategoryIllustrations'

const BASE_URL = 'https://www.dentalprecios.cl'

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Qué es DentalPrecios?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'DentalPrecios es el primer comparador de precios de insumos dentales en Chile. Recopilamos precios de múltiples proveedores como Techdent, MayorDent, Dentobal y más, para que los dentistas encuentren el mejor precio en composites, adhesivos, instrumental y todo lo que necesitan para su consulta.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cómo funciona la comparación de precios?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Nuestro sistema monitorea diariamente los precios de los principales proveedores dentales de Chile. Mostramos el precio más bajo disponible, la diferencia entre tiendas y el historial de precios para que puedas comprar en el momento justo.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cuántos productos y proveedores comparan?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Actualmente comparamos más de 7.800 productos de insumos dentales entre los principales proveedores de Chile, incluyendo Techdent, MayorDent, Dentobal, DentalStore, Depodental y más.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Es gratis usar DentalPrecios?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí, DentalPrecios es completamente gratis para comparar precios de insumos dentales. Puedes buscar, filtrar y comparar precios sin costo.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Qué productos dentales puedo comparar?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Puedes comparar precios de resinas y composites (3M, Ivoclar, Kerr), adhesivos dentales, cementos, instrumental, fresas y diamantes, materiales de endodoncia, ortodoncia, implantes, anestesia, flúor, ácido grabador, y muchos más. Cubrimos más de 30 categorías de productos dentales.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Dónde comprar insumos dentales más baratos en Chile?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Los precios varían entre proveedores como Techdent, MayorDent, Dentobal, DentalStore, Depodental y otros. DentalPrecios te muestra el precio más bajo de cada producto comparando todos los proveedores, para que siempre compres al mejor precio.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cómo sé cuándo es buen momento para comprar un producto dental?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'DentalPrecios ofrece historial de precios de los últimos 30 días para cada producto. Puedes ver si el precio actual está más alto o más bajo que su promedio. También puedes activar alertas de precio para recibir notificaciones cuando baje el precio de un producto.',
      },
    },
  ],
}

export default async function Home() {
  const supabase = await createClient()

  // Fetch counts
  const [
    { count: productCount },
    { data: suppliers },
    { data: categories },
    { data: trendingProducts },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('suppliers').select('*').eq('active', true).order('name'),
    supabase
      .from('categories')
      .select('id, name, slug, parent_id')
      .is('parent_id', null)
      .order('name'),
    supabase
      .from('products')
      .select('*')
      .limit(8),
  ])

  // Get prices for trending products
  const trendingIds = trendingProducts?.map((p) => p.id) || []
  const { data: trendingPrices } = trendingIds.length > 0
    ? await supabase
        .from('prices')
        .select('*, supplier:suppliers(*)')
        .in('product_id', trendingIds)
        .order('scraped_at', { ascending: false })
    : { data: [] }

  const latestPrices = aggregateLatestPrices(trendingPrices || [])
  const productsWithPrices = buildProductsWithPrices(trendingProducts || [], latestPrices)
    .sort((a, b) => b.store_count - a.store_count)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <HeroSection
        productCount={productCount || 0}
        supplierCount={suppliers?.length || 0}
      />

      <PracticeTypes />

      {/* Categories */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Categor&iacute;as populares
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories?.map((cat) => {
              const Icon = getCategoryIcon(cat.slug)
              return (
                <Link
                  key={cat.id}
                  href={`/categorias/${cat.slug}`}
                  className="group flex flex-col items-center gap-3 p-6 bg-card rounded-xl border border-border hover:shadow-md hover:border-primary/20 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {cat.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <TrendingProducts products={productsWithPrices} />
      <SupplierShowcase suppliers={suppliers || []} />
      <HowItWorks />
    </>
  )
}
