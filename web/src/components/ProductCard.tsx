import Link from 'next/link'
import { ProductWithPrices } from '@/lib/types'

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
}

export default function ProductCard({ product }: { product: ProductWithPrices }) {
  return (
    <Link
      href={`/producto/${product.id}`}
      className="block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition p-4"
    >
      <div className="flex gap-4">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-20 h-20 object-contain rounded" />
        ) : (
          <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-2xl">🦷</div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{product.name}</h3>
          {product.brand && <p className="text-sm text-gray-500">{product.brand}</p>}
          <div className="mt-2 flex items-baseline gap-2">
            {product.lowest_price > 0 ? (
              <>
                <span className="text-lg font-bold text-green-600">
                  {formatCLP(product.lowest_price)}
                </span>
                <span className="text-sm text-gray-400">
                  en {product.store_count} {product.store_count === 1 ? 'tienda' : 'tiendas'}
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-400">Sin precio disponible</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
