import Link from 'next/link'
import { ProductWithPrices } from '@/lib/types'
import { formatCLP } from '@/lib/queries/products'
import ProductImage from '@/components/ProductImage'
import { Badge } from '@/components/ui/badge'

interface ProductCardProps {
  product: ProductWithPrices
  view?: 'grid' | 'list'
}

export default function ProductCard({ product, view = 'grid' }: ProductCardProps) {
  if (view === 'list') {
    return (
      <Link
        href={`/producto/${product.id}`}
        className="group flex gap-4 bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all"
      >
        <ProductImage
          imageUrl={product.image_url}
          productName={product.name}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
            {product.name}
          </h3>
          {product.brand && (
            <p className="text-sm text-muted-foreground">{product.brand}</p>
          )}
          <div className="mt-2 flex items-baseline gap-2">
            {product.lowest_price > 0 ? (
              <>
                <span className="text-lg font-bold text-price">
                  {formatCLP(product.lowest_price)}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {product.store_count} {product.store_count === 1 ? 'tienda' : 'tiendas'}
                </Badge>
              </>
            ) : product.catalog_only ? (
              <>
                <span className="text-sm font-medium text-primary">Consultar precio</span>
                <Badge variant="outline" className="text-xs">
                  {product.store_count} {product.store_count === 1 ? 'proveedor' : 'proveedores'}
                </Badge>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Sin precio disponible</span>
            )}
          </div>
        </div>
      </Link>
    )
  }

  // Grid view
  return (
    <Link
      href={`/producto/${product.id}`}
      className="group flex flex-col bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all min-h-[220px]"
    >
      <div className="flex justify-center mb-3">
        <ProductImage
          imageUrl={product.image_url}
          productName={product.name}
          size="md"
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
      <div className="mt-auto pt-3 flex items-baseline gap-2">
        {product.lowest_price > 0 ? (
          <>
            <span className="text-lg font-bold text-price">
              {formatCLP(product.lowest_price)}
            </span>
            <span className="text-xs text-muted-foreground">
              {product.store_count} {product.store_count === 1 ? 'tienda' : 'tiendas'}
            </span>
          </>
        ) : product.catalog_only ? (
          <>
            <span className="text-sm font-medium text-primary">Consultar precio</span>
            <span className="text-xs text-muted-foreground">
              {product.store_count} {product.store_count === 1 ? 'proveedor' : 'proveedores'}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Sin precio</span>
        )}
      </div>
    </Link>
  )
}
