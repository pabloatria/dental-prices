import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCLP } from '@/lib/queries/products'
import RemoveFromCartButton from '@/components/cart/RemoveFromCartButton'

export const metadata: Metadata = {
  title: 'Mi Carrito',
  robots: { index: false, follow: false },
}

interface CartItemRow {
  id: string
  product_id: string
  supplier_id: string
  price_snapshot: number
  created_at: string
  products: { id: string; name: string; brand: string | null; image_url: string | null }
  suppliers: { id: string; name: string; logo_url: string | null; website_url: string }
}

export default async function CartPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/ingresar')
  }

  const { data: cartItems } = await supabase
    .from('cart_items')
    .select(`
      id,
      product_id,
      supplier_id,
      price_snapshot,
      created_at,
      products ( id, name, brand, image_url ),
      suppliers ( id, name, logo_url, website_url )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const items = (cartItems || []) as unknown as CartItemRow[]

  // Group by supplier
  const grouped = new Map<string, { supplier: CartItemRow['suppliers']; items: CartItemRow[] }>()
  for (const item of items) {
    const key = item.supplier_id
    if (!grouped.has(key)) {
      grouped.set(key, { supplier: item.suppliers, items: [] })
    }
    grouped.get(key)!.items.push(item)
  }

  const grandTotal = items.reduce((sum, item) => sum + item.price_snapshot, 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-2">Mi Carrito</h1>
      <p className="text-muted-foreground mb-8">
        {items.length > 0
          ? `${items.length} producto${items.length !== 1 ? 's' : ''} de ${grouped.size} proveedor${grouped.size !== 1 ? 'es' : ''}`
          : 'Tu carrito está vacío'}
      </p>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
          <p className="text-muted-foreground mb-4">Agrega productos desde las páginas de comparación de precios</p>
          <Link
            href="/buscar"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Buscar productos
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([supplierId, { supplier, items: groupItems }]) => {
            const subtotal = groupItems.reduce((sum, item) => sum + item.price_snapshot, 0)
            const firstItem = groupItems[0]
            const redirectUrl = `/api/redirect?url=${encodeURIComponent(supplier.website_url)}&product=${firstItem.product_id}&supplier=${supplierId}&source=cart`

            return (
              <div key={supplierId} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Supplier header */}
                <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-3">
                    {supplier.logo_url && (
                      <img src={supplier.logo_url} alt={supplier.name} className="w-8 h-8 rounded" />
                    )}
                    <h2 className="font-semibold text-foreground">{supplier.name}</h2>
                    <span className="text-sm text-muted-foreground">
                      {groupItems.length} producto{groupItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="font-bold text-foreground">{formatCLP(subtotal)}</span>
                </div>

                {/* Products */}
                <div className="divide-y divide-border/50">
                  {groupItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center shrink-0">
                        {item.products.image_url ? (
                          <img src={item.products.image_url} alt="" className="w-8 h-8 object-contain" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-border" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/producto/${item.product_id}`} className="text-sm font-medium text-foreground hover:text-primary truncate block">
                          {item.products.name}
                        </Link>
                        {item.products.brand && (
                          <p className="text-xs text-muted-foreground">{item.products.brand}</p>
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground shrink-0">
                        {formatCLP(item.price_snapshot)}
                      </span>
                      <RemoveFromCartButton cartItemId={item.id} />
                    </div>
                  ))}
                </div>

                {/* Buy button */}
                <div className="px-5 py-4 bg-muted/30 border-t border-border">
                  <a
                    href={redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Ir a comprar en {supplier.name}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                </div>
              </div>
            )
          })}

          {/* Grand total */}
          <div className="flex items-center justify-between px-5 py-4 bg-foreground text-background rounded-xl">
            <span className="font-semibold">Total estimado</span>
            <span className="text-xl font-bold">{formatCLP(grandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
