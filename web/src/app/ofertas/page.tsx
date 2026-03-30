import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import OfferCard from '@/components/product/OfferCard'

const BASE_URL = 'https://www.dentalprecios.cl'

export const metadata: Metadata = {
  title: 'Ofertas en insumos dentales hoy | DentalPrecios',
  description:
    'Descuentos activos detectados hoy en insumos dentales. Composites, adhesivos, instrumental y más con hasta 40% de descuento en proveedores chilenos.',
  alternates: { canonical: `${BASE_URL}/ofertas` },
  robots: { index: true, follow: true },
}

export const revalidate = 3600

export default async function OfertasPage() {
  const supabase = await createClient()

  const { data: offerPrices } = await supabase
    .from('prices')
    .select(`
      product_id,
      supplier_id,
      price,
      original_price,
      product_url,
      scraped_at,
      products!inner (
        id,
        name,
        brand,
        image_url
      ),
      suppliers!inner (
        id,
        name
      )
    `)
    .not('original_price', 'is', null)
    .gt('original_price', 0)
    .order('scraped_at', { ascending: false })
    .limit(500)

  // Dedup: keep latest per (product_id, supplier_id)
  const seen = new Set<string>()
  const offers = ((offerPrices || []) as any[])
    .filter(row => {
      const key = `${row.product_id}:${row.supplier_id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .filter(row => row.original_price > row.price * 1.10)
    .map(row => ({
      product_id: row.product_id,
      supplier_id: row.supplier_id,
      product_name: row.products.name,
      brand: row.products.brand,
      image_url: row.products.image_url,
      price: row.price,
      original_price: row.original_price,
      discount_pct: Math.round(((row.original_price - row.price) / row.original_price) * 100),
      supplier_name: row.suppliers.name,
      product_url: row.product_url,
    }))
    .sort((a, b) => b.discount_pct - a.discount_pct)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          🔥 Ofertas del día
        </h1>
        <p className="text-muted-foreground">
          {offers.length > 0
            ? `${offers.length} descuento${offers.length !== 1 ? 's' : ''} activo${offers.length !== 1 ? 's' : ''} detectado${offers.length !== 1 ? 's' : ''} hoy`
            : 'No hay ofertas activas en este momento. Vuelve mañana — los precios se actualizan diariamente.'}
        </p>
      </div>

      {offers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {offers.map((offer) => (
            <OfferCard key={`${offer.product_id}-${offer.supplier_id}`} offer={offer} />
          ))}
        </div>
      )}
    </div>
  )
}
