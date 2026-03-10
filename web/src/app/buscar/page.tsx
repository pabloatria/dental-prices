import SearchBar from '@/components/SearchBar'
import ProductCard from '@/components/ProductCard'
import { ProductWithPrices } from '@/lib/types'

interface SearchResult {
  products: ProductWithPrices[]
  total: number
  page: number
  pages: number
}

async function searchProducts(query: string, page: number): Promise<SearchResult> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}&page=${page}`, {
    cache: 'no-store',
  })
  return res.json()
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''
  const page = parseInt(params.page || '1')
  const result = await searchProducts(query, page)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/" className="text-2xl font-bold text-blue-600 shrink-0">DentalPrecios</a>
          <div className="flex-1">
            <SearchBar />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500 mb-6">
          {result.total} resultado{result.total !== 1 ? 's' : ''} para &quot;{query}&quot;
        </p>

        <div className="space-y-4">
          {result.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {result.products.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-gray-400">No se encontraron productos</p>
            <p className="text-sm text-gray-400 mt-2">Intenta con otro t&#233;rmino de b&#250;squeda</p>
          </div>
        )}
      </div>
    </main>
  )
}
