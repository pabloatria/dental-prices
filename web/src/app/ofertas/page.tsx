import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { fetchActiveOffers } from '@/lib/queries/offers'
import OfferCard from '@/components/product/OfferCard'

const BASE_URL = 'https://www.dentalprecios.cl'

export const metadata: Metadata = {
  title: 'Ofertas en insumos dentales hoy',
  description:
    'Descuentos activos detectados hoy en insumos dentales. Composites, adhesivos, instrumental y más con hasta 40% de descuento en proveedores chilenos.',
  alternates: { canonical: `${BASE_URL}/ofertas` },
  robots: { index: true, follow: true },
}

export const revalidate = 900 // 15 min, offers change frequently, stale cache = 0 offers shown

export default async function OfertasPage() {
  const supabase = createPublicClient()
  const offers = await fetchActiveOffers(supabase, 500)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          🔥 Ofertas del día
        </h1>
        <p className="text-muted-foreground">
          {offers.length > 0
            ? `${offers.length} descuento${offers.length !== 1 ? 's' : ''} activo${offers.length !== 1 ? 's' : ''} detectado${offers.length !== 1 ? 's' : ''} hoy`
            : 'No hay ofertas activas en este momento. Vuelve mañana, los precios se actualizan diariamente.'}
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
