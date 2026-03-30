import Link from 'next/link'
import OfferCard from '@/components/product/OfferCard'

interface Offer {
  product_id: string
  supplier_id: string
  product_name: string
  brand: string | null
  image_url: string | null
  price: number
  original_price: number
  discount_pct: number
  supplier_name: string
  product_url: string
}

export default function OfertasSection({ offers }: { offers: Offer[] }) {
  if (offers.length === 0) return null

  const top8 = offers.slice(0, 8)

  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">🔥 Ofertas del día</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Descuentos activos detectados hoy entre los proveedores
            </p>
          </div>
          <Link
            href="/ofertas"
            className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
          >
            Ver todas →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {top8.map(offer => (
            <OfferCard key={`${offer.product_id}-${offer.supplier_id}`} offer={offer} />
          ))}
        </div>
      </div>
    </section>
  )
}
