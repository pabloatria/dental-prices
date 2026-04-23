import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import Link from 'next/link'
import { getCategoryIcon } from '@/components/icons/CategoryIllustrations'

const BASE_URL = 'https://www.dentalprecios.cl'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Categorías de Insumos Dentales',
  description:
    '33 categorías de insumos odontológicos con precios comparados de 70 proveedores chilenos. Resinas, anestesia, fresas, cementos, implantes y más.',
  alternates: { canonical: `${BASE_URL}/categorias` },
  openGraph: {
    title: 'Categorías de Insumos Dentales: DentalPrecios',
    description:
      '33 categorías de insumos odontológicos con precios comparados de 70 proveedores chilenos. Resinas, anestesia, fresas, cementos, implantes y más.',
    url: `${BASE_URL}/categorias`,
  },
}

export default async function CategoriesPage() {
  const supabase = createPublicClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .is('parent_id', null)
    .order('name')

  // Get product counts per category via server-side RPC.
  // PostgREST caps responses at 1000 rows regardless of .limit(), so a direct
  // `select('category_id').in(...)` would silently undercount on a 16k-product
  // table. The RPC does COUNT(*) GROUP BY in Postgres and returns one row per
  // category.
  const counts = new Map<string, number>()
  const { data: countData } = await supabase.rpc('get_category_product_counts')
  for (const row of countData || []) {
    if (row.category_id) {
      counts.set(row.category_id, Number(row.product_count) || 0)
    }
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Categorías', item: `${BASE_URL}/categorias` },
    ],
  }

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Categorías de productos dentales',
    description: 'Todas las categorías de insumos dentales disponibles en DentalPrecios.',
    url: `${BASE_URL}/categorias`,
    numberOfItems: categories?.length || 0,
    publisher: { '@id': `${BASE_URL}/#organization` },
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Categorías</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground mb-2">Todas las categorías</h1>
      <p className="text-muted-foreground mb-8">
        Explora nuestras {categories?.length || 0} categorías de productos dentales
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories?.map((cat) => {
          const Icon = getCategoryIcon(cat.slug)
          const productCount = counts.get(cat.id) || 0
          return (
            <Link
              key={cat.id}
              href={`/categorias/${cat.slug}`}
              className="group flex flex-col items-center gap-3 p-6 bg-card rounded-xl border border-border hover:shadow-md hover:border-primary/20 transition-all text-center"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/5 to-primary/15 flex items-center justify-center group-hover:from-primary/10 group-hover:to-primary/25 transition-colors">
                <Icon className="w-8 h-8 text-primary/60 group-hover:text-primary/80 transition-colors" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {cat.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {productCount} producto{productCount !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
