# Ofertas Section — Design Doc
**Date:** 2026-03-30
**Status:** Approved

## Problem

Dental suppliers run short-lived promotions (1–2 days) that dentists currently have no way to discover. DentalPrecios scrapes daily but discards the original/regular price, making it impossible to surface or quantify discounts.

## Goals

- Detect and display active promotions across all scraped suppliers
- Show exact discount % when supplier marks a sale; fall back to price-drop detection (>10%) otherwise
- Auto-expire offers naturally — no manual TTL management needed
- Add two surfaces: homepage teaser + dedicated `/ofertas` page + nav link

---

## Architecture

### 1. DB Layer

**Migration:**
```sql
ALTER TABLE prices ADD COLUMN original_price integer;
```
- Nullable. NULL = no sale detected. Non-null = supplier is running a promotion.
- An active offer = `original_price IS NOT NULL AND original_price > price * 1.10`
- Offers auto-expire: if next scrape finds no sale, `original_price` is NULL → no longer shown

No separate offers table needed. No TTL logic.

### 2. Scraper Layer

**`woo_generic.py`**
- When `sale_el` is found (the `<ins>` element = discounted price), also grab the `<del>` element as `original_price`
- Pass `original_price` in the returned product dict

**`main.py`** — WooCommerce API scrapers (mayordent, surdent, tresdental, siromax, flamamed, gipfel, etc.)
- These use the WooCommerce REST API which returns both `sale_price` and `regular_price`
- Capture `regular_price` as `original_price` when `sale_price` is active

**`main.py`** — prices insert
```python
{
    "product_id": product_id,
    "supplier_id": supplier_id,
    "price": product["price"],
    "product_url": product.get("product_url", ""),
    "in_stock": product.get("in_stock", True),
    "original_price": product.get("original_price"),  # NEW — nullable
}
```

**Price-drop fallback (in main.py):**
- For products where `original_price` is NULL, compare with the most recent previous price for the same product+supplier
- If `prev_price > current_price * 1.10` → set `original_price = prev_price` (synthetic)
- This catches suppliers whose HTML/API doesn't expose a regular price but is visibly cheaper

### 3. API Layer

**New route:** `GET /api/offers`
```
Returns: [{
  product_id, product_name, brand, image_url, category_slug,
  price, original_price, discount_pct,
  supplier_name, supplier_id, product_url,
  scraped_at
}]
Sorted by: discount_pct DESC
Cap: 100 results
Cache: revalidate every 3600s (1 hour)
```

Query logic:
1. Get the latest price per (product_id, supplier_id)
2. Filter where `original_price IS NOT NULL AND original_price > price * 1.10`
3. Join with products and suppliers tables

### 4. Frontend Layer

**Discount badge component** — `web/src/components/product/DiscountBadge.tsx`
- Red pill: `-23%`
- Overlaid on ProductCard image (top-left corner)

**Homepage section** — inserted in `web/src/app/page.tsx`
- Heading: "🔥 Ofertas del día"
- Subheading: "Descuentos activos detectados hoy"
- Grid: top 8 deals, sorted by % discount
- CTA: "Ver todas las ofertas →" linking to `/ofertas`
- Hidden if 0 active offers (no empty section shown)

**`/ofertas` page** — `web/src/app/ofertas/page.tsx`
- SSR, metadata: "Ofertas en insumos dentales hoy | DentalPrecios"
- Full grid of all active deals
- Client-side filter by category (reuse FilterPanel)
- Sort: % descuento | Mayor ahorro CLP | Más reciente
- Each card shows: original price struck through, new price, red discount badge

**Navigation:**
- Top nav: "🔥 Ofertas" link added to `CategoryMegaMenu.tsx` and `MobileNav.tsx`
- Footer: added under "Navegación" section

---

## Expiry Behavior

Since we scrape daily:
- A product appears in Ofertas only while `original_price` is non-null in the latest price record
- When the supplier ends the promotion, next scrape writes a price row with `original_price = NULL`
- The offer vanishes from the page automatically — no cron job, no manual cleanup

---

## What We're NOT Building

- Email alerts for offers (deferred — 0 subscribers)
- Push notifications
- Offer history / "was on sale" indicators
- Admin panel to manually flag offers
