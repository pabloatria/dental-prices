import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SearchBar from '@/components/SearchBar'

export default async function CategoriesPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .is('parent_id', null)
    .order('name')

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/" className="text-2xl font-bold text-blue-600 shrink-0">DentalPrecios</a>
          <div className="flex-1"><SearchBar /></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Categor&#237;as</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories?.map((cat) => (
            <Link
              key={cat.id}
              href={`/categorias/${cat.slug}`}
              className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition text-center"
            >
              <span className="text-lg font-medium text-gray-800">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
