import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PriceTable from '@/components/PriceTable'
import PriceChart from '@/components/PriceChart'
import SearchBar from '@/components/SearchBar'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (!product) notFound()

  // Get all prices with supplier info
  const { data: allPrices } = await supabase
    .from('prices')
    .select('*, supplier:suppliers(*)')
    .eq('product_id', id)
    .order('scraped_at', { ascending: false })

  // Latest price per supplier
  const latestBySupplier = new Map()
  for (const price of allPrices || []) {
    if (!latestBySupplier.has(price.supplier_id)) {
      latestBySupplier.set(price.supplier_id, price)
    }
  }
  const currentPrices = Array.from(latestBySupplier.values())

  // Price history (last 30 days, lowest price per day)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const priceHistory = (allPrices || [])
    .filter(p => new Date(p.scraped_at) >= thirtyDaysAgo)
    .reduce((acc: { date: string; price: number; supplier: string }[], p) => {
      const date = new Date(p.scraped_at).toISOString().split('T')[0]
      const existing = acc.find(a => a.date === date)
      if (!existing || p.price < existing.price) {
        const filtered = acc.filter(a => a.date !== date)
        filtered.push({ date, price: p.price, supplier: p.supplier.name })
        return filtered
      }
      return acc
    }, [])
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/" className="text-2xl font-bold text-blue-600 shrink-0">DentalPrecios</a>
          <div className="flex-1"><SearchBar /></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex gap-6">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-32 h-32 object-contain" />
            ) : (
              <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center text-4xl">&#129463;</div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              {product.brand && <p className="text-gray-500 mt-1">{product.brand}</p>}
              {product.description && <p className="text-gray-600 mt-3">{product.description}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Comparar precios</h2>
          <PriceTable prices={currentPrices} />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Historial de precios (30 d&#237;as)</h2>
          <PriceChart priceHistory={priceHistory} />
        </div>
      </div>
    </main>
  )
}
