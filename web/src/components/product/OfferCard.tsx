import Link from 'next/link'
import Image from 'next/image'
import { formatCLP } from '@/lib/queries/products'
import DiscountBadge from './DiscountBadge'

interface Offer {
  product_id: string
  product_name: string
  brand: string | null
  image_url: string | null
  price: number
  original_price: number
  discount_pct: number
  supplier_name: string
  product_url: string
}

export default function OfferCard({ offer }: { offer: Offer }) {
  return (
    <Link
      href={`/producto/${offer.product_id}`}
      className="group relative flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Discount badge — top-left overlay */}
      <div className="absolute top-2 left-2 z-10">
        <DiscountBadge originalPrice={offer.original_price} currentPrice={offer.price} />
      </div>

      {/* Product image */}
      <div className="relative aspect-square bg-muted flex items-center justify-center p-4">
        {offer.image_url ? (
          <Image
            src={offer.image_url}
            alt={offer.product_name}
            fill
            className="object-contain p-3"
            sizes="(max-width: 640px) 50vw, 200px"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-border" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3 flex-1">
        <p className="text-xs text-muted-foreground truncate">{offer.supplier_name}</p>
        <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {offer.product_name}
        </h3>
        {offer.brand && (
          <p className="text-xs text-muted-foreground">{offer.brand}</p>
        )}
        <div className="mt-auto pt-2">
          <p className="text-xs text-muted-foreground line-through">
            {formatCLP(offer.original_price)}
          </p>
          <p className="text-base font-bold text-foreground">
            {formatCLP(offer.price)}
          </p>
        </div>
      </div>
    </Link>
  )
}
