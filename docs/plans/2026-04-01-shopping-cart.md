# Shopping Cart Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a shopping cart that groups items by supplier and provides trackable outbound links, available to registered users only.

**Architecture:** New `cart_items` Supabase table with RLS. `AddToCartButton` client component in the price table. `CartIcon` in header with badge. `/mi-carrito` page groups items by supplier with "Ir a comprar" tracked links. Click tracking extended with `source` column.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres + Auth + RLS), TypeScript, Tailwind CSS.

---

### Task 1: DB Migration — create `cart_items` table and add `source` to `click_events`

**Files:**
- Create: `web/supabase/migrations/20260401_add_cart_items_table.sql`

**Step 1: Write the migration file**

```sql
-- Shopping cart table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  price_snapshot integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Prevent duplicate product+supplier per user
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_unique ON cart_items(user_id, product_id, supplier_id);

-- RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cart" ON cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart" ON cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart" ON cart_items
  FOR DELETE USING (auth.uid() = user_id);

-- Add source column to click_events for tracking origin
ALTER TABLE click_events ADD COLUMN IF NOT EXISTS source varchar(20);
```

**Step 2: Run migration in Supabase SQL Editor** (user action)

**Step 3: Commit**

```bash
git add web/supabase/migrations/20260401_add_cart_items_table.sql
git commit -m "feat: add cart_items table and source column to click_events"
```

---

### Task 2: Create `AddToCartButton` client component

**Files:**
- Create: `web/src/components/product/AddToCartButton.tsx`

**Context:** Follow the exact same pattern as `FavoriteButton.tsx` (client component, checks auth, inserts to Supabase table). This button goes next to each supplier row in the price table.

**Step 1: Write the component**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AddToCartButtonProps {
  productId: string
  supplierId: string
  price: number
}

export default function AddToCartButton({ productId, supplierId, price }: AddToCartButtonProps) {
  const [inCart, setInCart] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('cart_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('supplier_id', supplierId)
        .maybeSingle()

      setInCart(!!data)
    }
    check()
  }, [productId, supplierId])

  const addToCart = async () => {
    if (!userId) {
      // Not logged in — prompt to register
      if (window.confirm('Para usar el carrito necesitas una cuenta. ¿Ir a crear cuenta?')) {
        window.location.href = '/ingresar'
      }
      return
    }

    setLoading(true)
    const supabase = createClient()

    if (inCart) {
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId)
        .eq('supplier_id', supplierId)
      setInCart(false)
    } else {
      await supabase
        .from('cart_items')
        .upsert({
          user_id: userId,
          product_id: productId,
          supplier_id: supplierId,
          price_snapshot: price,
        }, { onConflict: 'user_id,product_id,supplier_id' })
      setInCart(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={addToCart}
      disabled={loading}
      title={inCart ? 'Quitar del carrito' : 'Agregar al carrito'}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-sm transition-colors disabled:opacity-50 ${
        inCart
          ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
          : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      <svg className="w-4 h-4" fill={inCart ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    </button>
  )
}
```

**Step 2: Commit**

```bash
git add web/src/components/product/AddToCartButton.tsx
git commit -m "feat: add AddToCartButton client component"
```

---

### Task 3: Add cart button to `EnhancedPriceTable`

**Files:**
- Modify: `web/src/components/product/EnhancedPriceTable.tsx`

**Step 1: Add import at top**

```typescript
import AddToCartButton from '@/components/product/AddToCartButton'
```

**Step 2: Add cart button next to "Ir a comprar" link**

Find the `<td>` containing the "Ir a comprar" link (line 103-121). Wrap the link and cart button in a flex container. Replace:

```tsx
                <td className="py-4 px-4 text-right">
                  <a
                    href={`/api/redirect?url=${encodeURIComponent(price.product_url)}&product=${productId}&supplier=${price.supplier_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isCatalog
                        ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                        : isBest
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-card border border-border text-foreground hover:bg-accent'
                    }`}
                  >
                    {isCatalog ? 'Contactar proveedor' : 'Ir a comprar'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                </td>
```

With:

```tsx
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!isCatalog && (
                      <AddToCartButton
                        productId={productId}
                        supplierId={price.supplier_id}
                        price={price.price}
                      />
                    )}
                    <a
                      href={`/api/redirect?url=${encodeURIComponent(price.product_url)}&product=${productId}&supplier=${price.supplier_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isCatalog
                          ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                          : isBest
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-card border border-border text-foreground hover:bg-accent'
                      }`}
                    >
                      {isCatalog ? 'Contactar proveedor' : 'Ir a comprar'}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  </div>
                </td>
```

Note: `EnhancedPriceTable` is currently a server component (no `'use client'`). Since we're adding `AddToCartButton` (a client component) as a child, this works fine — server components can render client components as children.

**Step 3: Commit**

```bash
git add web/src/components/product/EnhancedPriceTable.tsx
git commit -m "feat: add cart button to price table next to Ir a comprar"
```

---

### Task 4: Create `CartIcon` client component for header

**Files:**
- Create: `web/src/components/layout/CartIcon.tsx`

**Step 1: Write the component**

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CartIcon() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { count: cartCount } = await supabase
        .from('cart_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setCount(cartCount || 0)
    }
    fetchCount()

    // Listen for cart changes (custom event dispatched by AddToCartButton)
    const handler = () => fetchCount()
    window.addEventListener('cart-updated', handler)
    return () => window.removeEventListener('cart-updated', handler)
  }, [])

  return (
    <Link
      href="/mi-carrito"
      className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-accent relative"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
      <span>Carrito</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
```

**Step 2: Update `AddToCartButton` to dispatch custom event**

In `AddToCartButton.tsx`, after `setInCart(true)` and `setInCart(false)`, add:

```typescript
window.dispatchEvent(new Event('cart-updated'))
```

**Step 3: Commit**

```bash
git add web/src/components/layout/CartIcon.tsx web/src/components/product/AddToCartButton.tsx
git commit -m "feat: add CartIcon with badge count and cart-updated event"
```

---

### Task 5: Add `CartIcon` to header

**Files:**
- Modify: `web/src/components/layout/Header.tsx`

**Step 1: Add import**

```typescript
import CartIcon from '@/components/layout/CartIcon'
```

**Step 2: Add `<CartIcon />` in the nav section**

Insert `<CartIcon />` before the "Blog" link in the `<nav>` (line 38). It should be the first item in the nav:

```tsx
        <nav className="flex items-center gap-2 shrink-0">
          <CartIcon />
          <Link href="/blog" ...>
```

**Step 3: Commit**

```bash
git add web/src/components/layout/Header.tsx
git commit -m "feat: add cart icon with badge to header navigation"
```

---

### Task 6: Update `/api/redirect` to accept `source` parameter

**Files:**
- Modify: `web/src/app/api/redirect/route.ts`

**Step 1: Read `source` from query params and include in insert**

After `const supplierId = ...`, add:

```typescript
const source = request.nextUrl.searchParams.get('source') || 'product_page'
```

In the `click_events` insert, add the `source` field:

```typescript
  if (productId && supplierId && !isBot) {
    void supabase
      .from('click_events')
      .insert({
        product_id: productId,
        supplier_id: supplierId,
        url,
        referrer: request.headers.get('referer') || null,
        user_agent: userAgent,
        source,
      })
      .then(() => {})
  }
```

**Step 2: Commit**

```bash
git add web/src/app/api/redirect/route.ts
git commit -m "feat: track click source (product_page vs cart) in click_events"
```

---

### Task 7: Create `/mi-carrito` page

**Files:**
- Create: `web/src/app/mi-carrito/page.tsx`

**Step 1: Write the page**

```typescript
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
            // Build redirect URL for first product as entry point
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
                    rel="noopener noreferrer"
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
```

**Step 2: Commit**

```bash
git add web/src/app/mi-carrito/page.tsx
git commit -m "feat: add /mi-carrito page with supplier-grouped cart"
```

---

### Task 8: Create `RemoveFromCartButton` client component

**Files:**
- Create: `web/src/components/cart/RemoveFromCartButton.tsx`

**Step 1: Write the component**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function RemoveFromCartButton({ cartItemId }: { cartItemId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const remove = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('cart_items').delete().eq('id', cartItemId)
    window.dispatchEvent(new Event('cart-updated'))
    router.refresh()
  }

  return (
    <button
      onClick={remove}
      disabled={loading}
      title="Quitar del carrito"
      className="text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50 shrink-0"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
    </button>
  )
}
```

**Step 2: Commit**

```bash
git add web/src/components/cart/RemoveFromCartButton.tsx
git commit -m "feat: add RemoveFromCartButton component"
```

---

### Task 9: Deploy and verify

**Step 1: Push all changes**

```bash
git push origin main
```

**Step 2: Run DB migration in Supabase SQL Editor** (user action — paste the SQL from Task 1)

**Step 3: Deploy to Vercel**

```bash
npx vercel --prod --yes --name web
```

**Step 4: Verify**
- Visit a product page → cart button visible next to each "Ir a comprar"
- Click cart button while logged out → prompt to create account
- Log in → click cart button → item added (button changes state)
- Click cart icon in header → goes to `/mi-carrito`
- Cart page shows items grouped by supplier with subtotals
- "Ir a comprar" links work and track with `source=cart`
