# Ofertas Section Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an "Ofertas del día" section that surfaces active supplier promotions on the homepage and a dedicated `/ofertas` page, with automatic daily expiry.

**Architecture:** Add `original_price` (nullable int) to the `prices` table. Scrapers populate it when a supplier marks a sale. The API route `/api/offers` queries products where `original_price > price * 1.10`. Offers vanish automatically when the next daily scrape finds no discount.

**Tech Stack:** Next.js 15 App Router (SSR), Supabase (Postgres), Python scrapers (BeautifulSoup + WC Store API), Tailwind CSS, TypeScript.

---

### Task 1: DB Migration — add `original_price` to prices table

**Files:**
- Create: `web/supabase/migrations/20260330_add_original_price_to_prices.sql`

**Step 1: Write the migration file**

```sql
-- Add original_price to prices table
-- NULL = no sale detected; non-null = supplier is actively running a promotion
ALTER TABLE prices ADD COLUMN IF NOT EXISTS original_price integer;

COMMENT ON COLUMN prices.original_price IS
  'Regular/list price when supplier has a sale active. NULL when no discount. '
  'A product is an offer when original_price IS NOT NULL AND original_price > price * 1.10';
```

**Step 2: Run the migration against Supabase**

Go to Supabase dashboard → SQL Editor → paste and run the migration.

Or via CLI if configured:
```bash
supabase db push
```

**Step 3: Verify in Supabase**

In the Table Editor, confirm `prices` now has an `original_price` column (type: int8, nullable).

**Step 4: Commit**

```bash
git add web/supabase/migrations/20260330_add_original_price_to_prices.sql
git commit -m "feat: add original_price column to prices table"
```

---

### Task 2: Update `woo_generic.py` — capture `<del>` as original_price

**Files:**
- Modify: `scrapers/suppliers/woo_generic.py` (lines ~168–205, the `_scrape_product` method)

**Context:** WooCommerce HTML marks sale prices with `<ins>` (sale) and `<del>` (original). The scraper already reads `<ins>` for the sale price but discards `<del>`.

**Step 1: Add the original_price capture after price is set**

Find this block in `_scrape_product`:
```python
# Price (prefer sale price)
price = 0
sale_el = el.select_one(self.sale_price_selector)
if sale_el:
    price = self._parse_clp(sale_el.get_text())
else:
    price_el = el.select_one(self.regular_price_selector)
    if price_el:
        price = self._parse_clp(price_el.get_text())
```

Replace with:
```python
# Price (prefer sale price)
price = 0
original_price = None
sale_el = el.select_one(self.sale_price_selector)
if sale_el:
    price = self._parse_clp(sale_el.get_text())
    # Grab struck-through regular price (<del> element)
    del_el = el.select_one("del .woocommerce-Price-amount, del .amount")
    if del_el:
        parsed_original = self._parse_clp(del_el.get_text())
        if parsed_original > price:
            original_price = parsed_original
else:
    price_el = el.select_one(self.regular_price_selector)
    if price_el:
        price = self._parse_clp(price_el.get_text())
```

**Step 2: Add `original_price` to the returned result dict**

Find the result dict at the end of `_scrape_product`:
```python
result = {
    "name": name,
    "price": price,
    "product_url": product_url,
    "in_stock": in_stock,
}
```

Replace with:
```python
result = {
    "name": name,
    "price": price,
    "product_url": product_url,
    "in_stock": in_stock,
}
if original_price:
    result["original_price"] = original_price
```

**Step 3: Manual smoke test**

```bash
cd scrapers
python -c "
from suppliers.clandent import ClandentScraper
s = ClandentScraper()
products = s.scrape()
on_sale = [p for p in products if p.get('original_price')]
print(f'Products with original_price: {len(on_sale)}')
for p in on_sale[:3]:
    print(p['name'], p['price'], '->', p['original_price'])
"
```
Expected: either 0 results (no current sales at Clandent) or a few with original_price > price.

**Step 4: Commit**

```bash
git add scrapers/suppliers/woo_generic.py
git commit -m "feat: capture original_price from WooCommerce HTML del element"
```

---

### Task 3: Update WooCommerce API scrapers — capture `regular_price`

**Files:**
- Modify: `scrapers/suppliers/mayordent.py`
- Modify: `scrapers/suppliers/surdent.py`
- Modify: `scrapers/suppliers/tresdental.py`
- Modify: `scrapers/suppliers/siromax.py`
- Modify: `scrapers/suppliers/flamamed.py`
- Modify: `scrapers/suppliers/gipfel.py`
- Modify: `scrapers/suppliers/superdental_cf.py`

**Context:** These scrapers all use the WooCommerce Store API which returns a `prices` dict with both `sale_price` and `price` (regular). When `sale_price` is non-empty and differs from `price`, the product is on sale.

**Step 1: Update `_parse_product` in each file**

Find the prices block (same pattern in all 7 files):
```python
prices = product.get("prices", {})
price_str = prices.get("sale_price") or prices.get("price", "0")
try:
    price = int(price_str)
except (ValueError, TypeError):
    return None
```

Replace with:
```python
prices = product.get("prices", {})
sale_price_str = prices.get("sale_price", "")
regular_price_str = prices.get("price", "0")

price_str = sale_price_str if sale_price_str else regular_price_str
try:
    price = int(price_str)
except (ValueError, TypeError):
    return None

# Detect active promotion: sale_price is set AND lower than regular price
original_price = None
try:
    if sale_price_str:
        regular = int(regular_price_str)
        if regular > price:
            original_price = regular
except (ValueError, TypeError):
    pass
```

Then in each scraper's result dict, add:
```python
if original_price:
    result["original_price"] = original_price
```

**Step 2: Verify pattern is consistent**

```bash
grep -n "sale_price\|original_price" scrapers/suppliers/mayordent.py scrapers/suppliers/surdent.py scrapers/suppliers/tresdental.py scrapers/suppliers/siromax.py scrapers/suppliers/flamamed.py scrapers/suppliers/gipfel.py scrapers/suppliers/superdental_cf.py
```
Expected: each file now references `original_price` in both the parsing and result sections.

**Step 3: Commit**

```bash
git add scrapers/suppliers/mayordent.py scrapers/suppliers/surdent.py scrapers/suppliers/tresdental.py scrapers/suppliers/siromax.py scrapers/suppliers/flamamed.py scrapers/suppliers/gipfel.py scrapers/suppliers/superdental_cf.py
git commit -m "feat: capture original_price from WooCommerce Store API regular_price field"
```

---

### Task 4: Update `main.py` — write `original_price` to DB + price-drop fallback

**Files:**
- Modify: `scrapers/main.py` (prices insert block ~line 748, and after `check_and_record_restock`)

**Step 1: Update the prices insert to include `original_price`**

Find the insert block:
```python
retry_supabase(lambda: supabase.table("prices").insert({
    "product_id": product_id,
    "supplier_id": supplier_id,
    "price": product["price"],
    "product_url": product.get("product_url", ""),
    "in_stock": product.get("in_stock", True),
}).execute())
```

Replace with:
```python
retry_supabase(lambda: supabase.table("prices").insert({
    "product_id": product_id,
    "supplier_id": supplier_id,
    "price": product["price"],
    "product_url": product.get("product_url", ""),
    "in_stock": product.get("in_stock", True),
    "original_price": product.get("original_price"),  # None if no sale
}).execute())
```

**Step 2: Add price-drop fallback function**

Add this function near `check_and_record_restock` (around line 650):

```python
def detect_price_drop(supabase, product_id, supplier_id, current_price):
    """
    Fallback offer detection: if price dropped >10% vs previous scrape,
    return the previous price as original_price (synthetic discount).
    Returns previous price int if drop ≥10%, else None.
    """
    result = supabase.table("prices") \
        .select("price") \
        .eq("product_id", product_id) \
        .eq("supplier_id", supplier_id) \
        .order("scraped_at", desc=True) \
        .limit(1) \
        .execute()

    if not result.data:
        return None  # First time seeing this product

    prev_price = result.data[0]["price"]
    if prev_price <= 0 or current_price <= 0:
        return None

    drop_pct = (prev_price - current_price) / prev_price
    if drop_pct >= 0.10:
        return prev_price
    return None
```

**Step 3: Use fallback in the main loop**

In the main scrape loop, after `check_and_record_restock` and before the prices insert, add:

```python
# Use explicit sale price if scraper found one; otherwise check for price drop
original_price = product.get("original_price")
if original_price is None:
    original_price = detect_price_drop(
        supabase, product_id, supplier_id, product["price"]
    )
if original_price:
    product["original_price"] = original_price
```

**Step 4: Commit**

```bash
git add scrapers/main.py
git commit -m "feat: write original_price to DB and add price-drop fallback detection"
```

---

### Task 5: Create `/api/offers` route

**Files:**
- Create: `web/src/app/api/offers/route.ts`

**Step 1: Write the route**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { aggregateLatestPrices } from '@/lib/queries/products'

export const revalidate = 3600 // Refresh every hour

export async function GET() {
  const supabase = await createClient()

  // Get latest price per (product_id, supplier_id) where original_price is set
  // and discount is at least 10%
  const { data: offerPrices, error } = await supabase
    .from('prices')
    .select(`
      id,
      product_id,
      supplier_id,
      price,
      original_price,
      product_url,
      scraped_at,
      products!inner (
        id,
        name,
        brand,
        image_url,
        category_id,
        categories (slug, name)
      ),
      suppliers!inner (
        id,
        name,
        website_url
      )
    `)
    .not('original_price', 'is', null)
    .gt('original_price', 0)
    .order('scraped_at', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Keep only the latest price per (product_id, supplier_id)
  const seen = new Set<string>()
  const latest = (offerPrices || []).filter(row => {
    const key = `${row.product_id}:${row.supplier_id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Filter: original_price must be > price * 1.10
  const offers = latest
    .filter(row => row.original_price > row.price * 1.10)
    .map(row => {
      const discountPct = Math.round(
        ((row.original_price - row.price) / row.original_price) * 100
      )
      return {
        product_id: row.product_id,
        product_name: (row.products as any).name,
        brand: (row.products as any).brand,
        image_url: (row.products as any).image_url,
        category_slug: (row.products as any).categories?.slug,
        category_name: (row.products as any).categories?.name,
        price: row.price,
        original_price: row.original_price,
        discount_pct: discountPct,
        supplier_id: row.supplier_id,
        supplier_name: (row.suppliers as any).name,
        product_url: row.product_url,
        scraped_at: row.scraped_at,
      }
    })
    .sort((a, b) => b.discount_pct - a.discount_pct)
    .slice(0, 100)

  return NextResponse.json({ offers, total: offers.length })
}
```

**Step 2: Test the route manually**

Start dev server and curl:
```bash
curl http://localhost:3000/api/offers | python3 -m json.tool | head -50
```
Expected: `{ "offers": [...], "total": N }` — may be 0 until scrapers run with the new `original_price` field populated.

**Step 3: Commit**

```bash
git add web/src/app/api/offers/route.ts
git commit -m "feat: add /api/offers endpoint returning active discounts"
```

---

### Task 6: Create `DiscountBadge` component

**Files:**
- Create: `web/src/components/product/DiscountBadge.tsx`

**Step 1: Write the component**

```typescript
interface DiscountBadgeProps {
  originalPrice: number
  currentPrice: number
  className?: string
}

export default function DiscountBadge({ originalPrice, currentPrice, className = '' }: DiscountBadgeProps) {
  const pct = Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
  if (pct < 10) return null

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white ${className}`}>
      -{pct}%
    </span>
  )
}
```

**Step 2: Commit**

```bash
git add web/src/components/product/DiscountBadge.tsx
git commit -m "feat: add DiscountBadge component for showing % discount"
```

---

### Task 7: Create `OfferCard` component

**Files:**
- Create: `web/src/components/product/OfferCard.tsx`

**Context:** A variant of ProductCard specifically for the offers grid — shows product image, name, supplier, both prices (original struck through), and the discount badge.

**Step 1: Write the component**

```typescript
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
```

**Step 2: Commit**

```bash
git add web/src/components/product/OfferCard.tsx
git commit -m "feat: add OfferCard component for offers grid"
```

---

### Task 8: Create `/ofertas` page

**Files:**
- Create: `web/src/app/ofertas/page.tsx`

**Step 1: Write the page**

```typescript
import type { Metadata } from 'next'
import OfferCard from '@/components/product/OfferCard'

const BASE_URL = 'https://www.dentalprecios.cl'

export const metadata: Metadata = {
  title: 'Ofertas en insumos dentales hoy | DentalPrecios',
  description:
    'Descuentos activos detectados hoy en insumos dentales. Composites, adhesivos, instrumental y más con hasta 40% de descuento en proveedores chilenos.',
  alternates: { canonical: `${BASE_URL}/ofertas` },
}

async function getOffers() {
  try {
    const res = await fetch(`${BASE_URL}/api/offers`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.offers || []
  } catch {
    return []
  }
}

export default async function OfertasPage() {
  const offers = await getOffers()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          🔥 Ofertas del día
        </h1>
        <p className="text-muted-foreground">
          {offers.length > 0
            ? `${offers.length} descuento${offers.length !== 1 ? 's' : ''} activo${offers.length !== 1 ? 's' : ''} detectado${offers.length !== 1 ? 's' : ''} hoy`
            : 'No hay ofertas activas en este momento. Vuelve mañana.'}
        </p>
      </div>

      {/* Grid */}
      {offers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {offers.map((offer: any) => (
            <OfferCard key={`${offer.product_id}-${offer.supplier_id}`} offer={offer} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify the page loads**

With dev server running, navigate to `http://localhost:3000/ofertas`.
Expected: page renders with header. Grid will be empty until scrapers populate `original_price`, which is correct.

**Step 3: Commit**

```bash
git add web/src/app/ofertas/page.tsx
git commit -m "feat: add /ofertas page listing all active promotions"
```

---

### Task 9: Add Ofertas section to homepage

**Files:**
- Modify: `web/src/app/page.tsx`
- Create: `web/src/components/home/OfertasSection.tsx`

**Step 1: Create the section component**

```typescript
// web/src/components/home/OfertasSection.tsx
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
        {/* Section header */}
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

        {/* Cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {top8.map(offer => (
            <OfferCard key={`${offer.product_id}-${offer.supplier_id}`} offer={offer} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Fetch offers in `page.tsx` and render the section**

In `web/src/app/page.tsx`, add the fetch alongside other data fetching at the top of the default export function:

```typescript
// At top of file, add import:
import OfertasSection from '@/components/home/OfertasSection'

// Inside the page component, add alongside other fetches:
const offersRes = await fetch(`${BASE_URL}/api/offers`, {
  next: { revalidate: 3600 },
}).catch(() => null)
const offersData = offersRes?.ok ? await offersRes.json() : { offers: [] }
const offers = offersData.offers || []
```

Then in the JSX, insert `<OfertasSection offers={offers} />` between the category grid section and the TrendingProducts section.

**Step 3: Verify on homepage**

Navigate to `http://localhost:3000`. The section should be absent if 0 offers (component returns null), which is correct pre-scrape.

**Step 4: Commit**

```bash
git add web/src/components/home/OfertasSection.tsx web/src/app/page.tsx
git commit -m "feat: add Ofertas del día section to homepage"
```

---

### Task 10: Add Ofertas to navigation

**Files:**
- Modify: `web/src/components/layout/CategoryMegaMenu.tsx`
- Modify: `web/src/components/layout/MobileNav.tsx`
- Modify: `web/src/components/layout/Footer.tsx`

**Step 1: Add to `CategoryMegaMenu.tsx`**

After the existing "Todas" link, add:
```tsx
<Link
  href="/ofertas"
  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors whitespace-nowrap"
>
  🔥 Ofertas
</Link>
```

**Step 2: Add to `MobileNav.tsx`**

Find the nav links in the mobile menu and add an Ofertas link:
```tsx
<Link href="/ofertas" className="flex items-center gap-3 px-4 py-3 text-red-500 font-medium">
  🔥 Ofertas del día
</Link>
```

**Step 3: Add to `Footer.tsx`**

In the "Navegación" section, add after the "Buscar productos" link:
```tsx
<li>
  <Link href="/ofertas" className="text-sm text-background/60 hover:text-background transition-colors">
    Ofertas del día
  </Link>
</li>
```

**Step 4: Verify nav in browser**

Check the nav bar shows "🔥 Ofertas" link. Check footer has "Ofertas del día".

**Step 5: Commit**

```bash
git add web/src/components/layout/CategoryMegaMenu.tsx web/src/components/layout/MobileNav.tsx web/src/components/layout/Footer.tsx
git commit -m "feat: add Ofertas link to nav bar, mobile nav, and footer"
```

---

### Task 11: Add `/ofertas` to sitemap

**Files:**
- Modify: `web/src/app/sitemap.ts`

**Step 1: Add static entry**

In the `staticPages` array, add:
```typescript
{
  url: `${baseUrl}/ofertas`,
  lastModified: new Date(),
  changeFrequency: 'daily' as const,
  priority: 0.8,
},
```

**Step 2: Commit**

```bash
git add web/src/app/sitemap.ts
git commit -m "feat: add /ofertas to sitemap"
```

---

### Task 12: Deploy and trigger scrape

**Step 1: Push all changes**

```bash
git push origin main
```

**Step 2: Verify Vercel deployment**

Check Vercel dashboard for successful build. Confirm `/ofertas` and `/api/offers` are live.

**Step 3: Trigger a scrape manually to populate `original_price`**

In GitHub Actions, go to the `scrape` workflow and trigger it manually ("Run workflow"). Wait for completion (~3-4 hours).

**Step 4: Check offers populated**

```bash
curl https://www.dentalprecios.cl/api/offers | python3 -m json.tool | head -30
```
Expected: `total` > 0 if any supplier has active sales.

**Step 5: Check homepage and `/ofertas` page**

Visit https://www.dentalprecios.cl and https://www.dentalprecios.cl/ofertas — Ofertas section should now show real deals.
