import Link from 'next/link'
import ProductImage from '@/components/ProductImage'
import { Badge } from '@/components/ui/badge'
import { formatCLP } from '@/lib/queries/products'
import type { ProductWithPrices } from '@/lib/types'

export default function TrendingProducts({ products }: { products: ProductWithPrices[] }) {
  if (products.length === 0) return null

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-foreground">Productos populares</h2>
          <Link href="/buscar" className="text-sm text-primary hover:underline font-medium">
            Ver todos
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/producto/${product.id}`}
              className="group bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all"
            >
              <div className="flex justify-center mb-3">
                <ProductImage
                  imageUrl={product.image_url}
                  productName={product.name}
                  size="md"
                />
              </div>
              {product.brand && (
                <Badge variant="secondary" className="mb-1 text-xs">
                  {product.brand}
                </Badge>
              )}
              <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              <div className="mt-3 flex items-baseline gap-2">
                {product.lowest_price > 0 ? (
                  <>
                    <span className="text-lg font-bold text-price">
                      {formatCLP(product.lowest_price)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {product.store_count} {product.store_count === 1 ? 'tienda' : 'tiendas'}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin precio</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
