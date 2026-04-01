# Shopping Cart — Design Doc
**Date:** 2026-04-01
**Status:** Approved

## Problem

Users find the best prices on DentalPrecios but have to manually visit each supplier site to buy. When buying from multiple suppliers (the optimal strategy), there's no way to organize the purchase. We need a cart that groups items by supplier and provides trackable links.

## Goals

- Let registered users build a shopping cart from the price comparison table
- Group cart items by supplier with subtotals
- Provide trackable "Ir a comprar" links per supplier group
- Track cart-originated clicks separately in reports
- Non-registered users see the button but get prompted to create an account

---

## Architecture

### DB Layer

**New table:**
```sql
CREATE TABLE cart_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  price_snapshot integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS: users can only access their own cart
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cart" ON cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart" ON cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart" ON cart_items
  FOR DELETE USING (auth.uid() = user_id);

-- Prevent duplicate product+supplier combos per user
CREATE UNIQUE INDEX cart_items_unique ON cart_items(user_id, product_id, supplier_id);
```

### Click Tracking Update

**`click_events` table:** Add `source` column (nullable varchar).
```sql
ALTER TABLE click_events ADD COLUMN source varchar(20);
```

Values: `null` (legacy/product page), `'cart'` (from cart page), `'product_page'` (from product page).

**`/api/redirect` route:** Accept optional `source` query param, store in `click_events.source`.

### Frontend Components

**1. `AddToCartButton` (new client component)**
- Placed in `EnhancedPriceTable.tsx` next to each "Ir a comprar" link
- Props: `productId`, `supplierId`, `price`, `productUrl`
- Behavior:
  - Checks auth via `supabase.auth.getUser()`
  - Not logged in → toast: "Crea una cuenta para usar el carrito" + link to `/ingresar`
  - Logged in → upsert to `cart_items` (unique on user_id+product_id+supplier_id)
  - Shows confirmation toast: "Agregado al carrito"
  - If already in cart → shows "Ya en el carrito" (disabled state)

**2. `CartIcon` (new client component in Header)**
- Cart icon with badge showing item count
- Queries `cart_items` count for current user
- Links to `/mi-carrito`
- No badge if 0 items or not logged in

**3. `/mi-carrito` page**
- Auth-gated: redirects to `/ingresar` if not logged in
- Server component that fetches cart items with product and supplier joins
- Groups items by supplier_id
- Each supplier group:
  - Supplier logo + name
  - Product list with name, brand, price snapshot, remove button
  - Subtotal for the group
  - "Ir a comprar en [Supplier]" button → `/api/redirect?url=...&source=cart`
- Grand total at bottom
- Empty state with link to search

### Data Flow

```
User on product page
  → clicks 🛒 button next to supplier price
  → AddToCartButton checks auth
  → If logged in: INSERT into cart_items (user_id, product_id, supplier_id, price_snapshot)
  → Toast: "Agregado al carrito"

User visits /mi-carrito
  → Server fetches cart_items WHERE user_id = current user
  → Joins products (name, brand, image) and suppliers (name, logo)
  → Groups by supplier_id
  → Renders grouped cart with subtotals

User clicks "Ir a comprar en Mayordent"
  → All Mayordent product URLs open via /api/redirect?source=cart
  → click_events logged with source='cart'
  → Reports can filter: "X clicks from cart vs Y from product page"
```

---

## What We're NOT Building

- Payment processing (future — marketplace phase)
- Quantity selection (1 unit per item for now)
- Price change notifications for cart items (future)
- Guest/anonymous cart (localStorage) — registered users only
- Order history or purchase confirmation
