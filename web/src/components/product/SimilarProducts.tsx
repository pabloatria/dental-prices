import Link from 'next/link'
import ProductImage from '@/components/ProductImage'
import { formatCLP } from '@/lib/queries/products'
import { Badge } from '@/components/ui/badge'
import type { ProductWithPrices } from '@/lib/types'

export default function SimilarProducts({ products }: { products: ProductWithPrices[] }) {
  if (products.length === 0) return null

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-4">Productos similares</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/producto/${product.id}`}
            className="group flex flex-col bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all"
          >
            <div className="flex justify-center mb-3">
              <ProductImage
                imageUrl={product.image_url}
                productName={product.name}
                size="sm"
              />
            </div>
            {product.brand && (
              <Badge variant="secondary" className="self-start mb-1 text-xs">
                {product.brand}
              </Badge>
            )}
            <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            <div className="mt-auto pt-2">
              {product.lowest_price > 0 ? (
                <span className="text-sm font-bold text-price">
                  {formatCLP(product.lowest_price)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Sin precio</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
