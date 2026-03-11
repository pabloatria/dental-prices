import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getCategoryIcon } from '@/components/icons/CategoryIllustrations'

export default async function CategoriesPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .is('parent_id', null)
    .order('name')

  // Get product counts per category
  const counts = new Map<string, number>()
  if (categories) {
    for (const cat of categories) {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', cat.id)
      counts.set(cat.id, count || 0)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
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
