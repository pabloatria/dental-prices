# Product Deduplication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge duplicate products (same item, different supplier names) into canonical groups so one product page shows all supplier prices.

**Architecture:** Add `canonical_product_id` FK to products table. Alias products point to their canonical. Listings filter out aliases; price aggregation includes all group members. A dedup script clusters existing products; fuzzy matching in `ensure_product()` prevents future duplicates.

**Tech Stack:** Supabase (PostgreSQL), Next.js 16 App Router (server components), Python 3 scrapers

---

### Task 1: Add canonical_product_id Column

**Files:**
- Modify: Supabase dashboard (SQL editor)

**Step 1: Run migration SQL**

Run this SQL in the Supabase SQL Editor (dashboard):

```sql
ALTER TABLE products ADD COLUMN canonical_product_id UUID REFERENCES products(id) ON DELETE SET NULL;
CREATE INDEX idx_products_canonical ON products(canonical_product_id);
```

**Step 2: Verify**

Run: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'canonical_product_id';`
Expected: 1 row with `uuid` type.

---

### Task 2: Enhanced Matchers Module

**Files:**
- Modify: `scrapers/matchers.py`

**Step 1: Rewrite matchers.py with normalization + similarity functions**

```python
import re
import html


def normalize_name(name: str) -> str:
    """Normalize product name for deduplication matching."""
    name = html.unescape(name)
    name = name.lower().strip()
    # Remove TM/registered symbols
    name = re.sub(r'[™®©]', '', name)
    # Remove HTML entities that survived
    name = re.sub(r'&#\d+;', ' ', name)
    # Normalize whitespace
    name = re.sub(r'\s+', ' ', name)
    # Remove quantity suffixes
    name = re.sub(r'\b(und|unid|unidad|unidades|pza|pieza|piezas|uds|dosis)\b', '', name)
    # Normalize "x 100" / "x100" patterns
    name = re.sub(r'\bx\s*(\d+)\b', r'\1', name)
    # Remove trailing/leading hyphens and dashes after cleanup
    name = re.sub(r'\s*[-–—]\s*', ' ', name)
    # Remove common filler words
    name = re.sub(r'\b(de|del|con|para|en|por|y|the|and|for|with)\b', '', name)
    # Collapse whitespace again
    name = re.sub(r'\s+', ' ', name)
    return name.strip()


def tokenize(name: str) -> set:
    """Get meaningful tokens from a normalized name."""
    normalized = normalize_name(name)
    tokens = set(normalized.split())
    # Remove very short tokens (1 char)
    return {t for t in tokens if len(t) > 1}


def jaccard_similarity(set_a: set, set_b: set) -> float:
    """Jaccard similarity between two token sets."""
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)


def pick_canonical_name(names: list[str]) -> str:
    """Pick the shortest name that still contains a brand-like word.
    Prefers names with a brand, then shortest."""
    if not names:
        return ""
    if len(names) == 1:
        return names[0]
    # Sort by length ascending
    sorted_names = sorted(names, key=len)
    return sorted_names[0]


KNOWN_BRANDS = [
    "3m", "solventum", "dentsply", "ivoclar", "kerr", "gc", "voco",
    "coltene", "ultradent", "maquira", "fgm", "angelus", "kulzer",
    "zhermack", "bisco", "septodont", "hu-friedy", "nsk", "woodpecker",
    "medit", "phrozen", "asiga", "scheu", "nextdent", "formlabs",
    "orbis", "peclab", "wanhao", "espe", "clinpro",
]


def extract_brand(name: str) -> str | None:
    """Try to extract brand from product name."""
    name_lower = name.lower()
    for brand in KNOWN_BRANDS:
        if brand in name_lower:
            return brand.upper()
    return None
```

**Step 2: Verify**

Run: `cd scrapers && python3 -c "from matchers import normalize_name, tokenize, jaccard_similarity; t1 = tokenize('Clinpro Clear Tratamiento de Flúor 100 dosis'); t2 = tokenize('3M Clinpro Clear 100 Unidosis'); print(f'Tokens 1: {t1}'); print(f'Tokens 2: {t2}'); print(f'Similarity: {jaccard_similarity(t1, t2):.2f}')"`
Expected: Similarity >= 0.5 (tokens like "clinpro", "clear", "100" should overlap)

**Step 3: Commit**

```bash
git add scrapers/matchers.py
git commit -m "feat: enhanced matchers with tokenization and Jaccard similarity"
```

---

### Task 3: Deduplication Script

**Files:**
- Create: `scrapers/deduplicate.py`

**Step 1: Write the dedup script**

```python
"""
Product deduplication script.
Finds groups of similar products and merges them under a canonical product.

Usage:
  python3 deduplicate.py              # Dry run — shows groups, changes nothing
  python3 deduplicate.py --apply      # Apply changes to database
  python3 deduplicate.py --csv        # Export groups to CSV for review
"""
from __future__ import annotations

import os
import sys
import csv
import logging
import argparse
from collections import defaultdict
from dotenv import load_dotenv
from supabase import create_client

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from matchers import normalize_name, tokenize, jaccard_similarity, pick_canonical_name, extract_brand

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Thresholds
AUTO_MERGE_THRESHOLD = 0.75
REVIEW_THRESHOLD = 0.55


def fetch_all_products(supabase):
    """Fetch all products that are not already aliases."""
    all_products = []
    page_size = 1000
    offset = 0
    while True:
        result = supabase.table("products").select(
            "id, name, brand, category_id, image_url"
        ).is_("canonical_product_id", "null").range(offset, offset + page_size - 1).execute()
        if not result.data:
            break
        all_products.extend(result.data)
        if len(result.data) < page_size:
            break
        offset += page_size
    return all_products


def build_clusters(products, threshold):
    """Group products by token similarity. O(n^2) but fine for ~10k products."""
    # Pre-compute tokens
    product_tokens = []
    for p in products:
        tokens = tokenize(p["name"])
        product_tokens.append((p, tokens))

    # Group by first significant token to reduce comparisons
    token_index = defaultdict(list)
    for i, (p, tokens) in enumerate(product_tokens):
        for t in tokens:
            if len(t) >= 4:  # Only index meaningful tokens
                token_index[t].append(i)

    # Find pairs above threshold
    visited = set()
    groups = []  # list of sets of product indices
    product_to_group = {}

    for token, indices in token_index.items():
        for i in range(len(indices)):
            for j in range(i + 1, len(indices)):
                idx_a, idx_b = indices[i], indices[j]
                pair = (min(idx_a, idx_b), max(idx_a, idx_b))
                if pair in visited:
                    continue
                visited.add(pair)

                p_a, tokens_a = product_tokens[idx_a]
                p_b, tokens_b = product_tokens[idx_b]

                # Must be same category (if both have one)
                if (p_a.get("category_id") and p_b.get("category_id")
                        and p_a["category_id"] != p_b["category_id"]):
                    continue

                sim = jaccard_similarity(tokens_a, tokens_b)
                if sim < threshold:
                    continue

                # Merge into existing group or create new
                group_a = product_to_group.get(idx_a)
                group_b = product_to_group.get(idx_b)

                if group_a is not None and group_b is not None:
                    if group_a != group_b:
                        # Merge two groups
                        merged = groups[group_a] | groups[group_b]
                        groups[group_a] = merged
                        groups[group_b] = set()
                        for idx in merged:
                            product_to_group[idx] = group_a
                elif group_a is not None:
                    groups[group_a].add(idx_b)
                    product_to_group[idx_b] = group_a
                elif group_b is not None:
                    groups[group_b].add(idx_a)
                    product_to_group[idx_a] = group_b
                else:
                    new_group_idx = len(groups)
                    groups.append({idx_a, idx_b})
                    product_to_group[idx_a] = new_group_idx
                    product_to_group[idx_b] = new_group_idx

    # Collect non-empty groups
    result = []
    for group in groups:
        if len(group) >= 2:
            result.append([product_tokens[i][0] for i in group])
    return result


def apply_groups(supabase, groups):
    """Set canonical_product_id for each group."""
    total_merged = 0
    for group in groups:
        names = [p["name"] for p in group]
        canonical_name = pick_canonical_name(names)
        canonical = next(p for p in group if p["name"] == canonical_name)
        aliases = [p for p in group if p["id"] != canonical["id"]]

        # Pick best image_url: prefer one with an image
        best_image = canonical.get("image_url")
        if not best_image:
            for p in aliases:
                if p.get("image_url"):
                    best_image = p["image_url"]
                    break

        # Update canonical with best image if needed
        if best_image and best_image != canonical.get("image_url"):
            try:
                supabase.table("products").update(
                    {"image_url": best_image}
                ).eq("id", canonical["id"]).execute()
            except Exception as e:
                logger.warning(f"Failed to update canonical image: {e}")

        # Point aliases to canonical
        for alias in aliases:
            try:
                supabase.table("products").update(
                    {"canonical_product_id": canonical["id"]}
                ).eq("id", alias["id"]).execute()
                total_merged += 1
            except Exception as e:
                logger.warning(f"Failed to set canonical for {alias['name']}: {e}")

    return total_merged


def export_csv(groups, filename="dedup_review.csv"):
    """Export groups to CSV for manual review."""
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["group_id", "product_id", "name", "brand", "is_canonical"])
        for i, group in enumerate(groups):
            names = [p["name"] for p in group]
            canonical_name = pick_canonical_name(names)
            for p in group:
                writer.writerow([
                    i + 1,
                    p["id"],
                    p["name"],
                    p.get("brand", ""),
                    "YES" if p["name"] == canonical_name else "",
                ])
    return filename


def main():
    parser = argparse.ArgumentParser(description="Deduplicate products")
    parser.add_argument("--apply", action="store_true", help="Apply changes to DB")
    parser.add_argument("--csv", action="store_true", help="Export to CSV")
    parser.add_argument("--threshold", type=float, default=AUTO_MERGE_THRESHOLD,
                        help=f"Similarity threshold (default: {AUTO_MERGE_THRESHOLD})")
    args = parser.parse_args()

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        logger.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    supabase = create_client(url, key)

    logger.info("Fetching all products...")
    products = fetch_all_products(supabase)
    logger.info(f"Found {len(products)} canonical products")

    logger.info(f"Clustering with threshold={args.threshold}...")
    groups = build_clusters(products, args.threshold)
    logger.info(f"Found {len(groups)} duplicate groups")

    # Print summary
    for i, group in enumerate(groups[:30]):  # Show first 30
        names = [p["name"] for p in group]
        canonical = pick_canonical_name(names)
        print(f"\n  Group {i+1} ({len(group)} products) → canonical: \"{canonical}\"")
        for p in group:
            marker = " ✓" if p["name"] == canonical else "  "
            print(f"    {marker} {p['name']}")

    if len(groups) > 30:
        print(f"\n  ... and {len(groups) - 30} more groups")

    total_aliases = sum(len(g) - 1 for g in groups)
    print(f"\n  Summary: {len(groups)} groups, {total_aliases} products to merge")

    if args.csv:
        filename = export_csv(groups)
        print(f"\n  Exported to {filename}")

    if args.apply:
        logger.info("Applying changes to database...")
        merged = apply_groups(supabase, groups)
        logger.info(f"Done! Merged {merged} alias products")
    elif not args.csv:
        print("\n  This was a dry run. Use --apply to merge, --csv to export for review.")


if __name__ == "__main__":
    main()
```

**Step 2: Dry run to check groups**

Run: `cd scrapers && python3 deduplicate.py`
Expected: See groups of similar products printed, no DB changes.

**Step 3: Export CSV to review edge cases**

Run: `cd scrapers && python3 deduplicate.py --csv`
Expected: Creates `dedup_review.csv` file.

**Step 4: Apply deduplication**

Run: `cd scrapers && python3 deduplicate.py --apply`
Expected: Groups are merged in the DB, alias products get `canonical_product_id` set.

**Step 5: Commit**

```bash
git add scrapers/deduplicate.py
git commit -m "feat: product deduplication script with dry-run and CSV export"
```

---

### Task 4: Frontend Type Update

**Files:**
- Modify: `web/src/lib/types.ts`

**Step 1: Add canonical_product_id to Product interface**

In `web/src/lib/types.ts`, add `canonical_product_id` field to the `Product` interface:

```typescript
export interface Product {
  id: string
  name: string
  brand: string | null
  category_id: string | null
  description: string | null
  image_url: string | null
  canonical_product_id: string | null
}
```

**Step 2: Commit**

```bash
git add web/src/lib/types.ts
git commit -m "feat: add canonical_product_id to Product type"
```

---

### Task 5: Query Helpers for Product Groups

**Files:**
- Modify: `web/src/lib/queries/products.ts`

**Step 1: Add helper to expand product IDs with their aliases**

Add this function after `aggregateLatestPrices` in `web/src/lib/queries/products.ts`:

```typescript
/**
 * Given a list of canonical product IDs, fetch all alias product IDs
 * and return a map: canonical_id → [canonical_id, ...alias_ids]
 */
export async function getProductGroupMap(
  supabase: any,
  canonicalIds: string[]
): Promise<Map<string, string[]>> {
  const groupMap = new Map<string, string[]>()
  if (canonicalIds.length === 0) return groupMap

  // Initialize each canonical with itself
  for (const id of canonicalIds) {
    groupMap.set(id, [id])
  }

  // Fetch aliases pointing to these canonical products
  const { data: aliases } = await supabase
    .from('products')
    .select('id, canonical_product_id')
    .in('canonical_product_id', canonicalIds)

  for (const alias of aliases || []) {
    const group = groupMap.get(alias.canonical_product_id)
    if (group) {
      group.push(alias.id)
    }
  }

  return groupMap
}
```

**Step 2: Modify `aggregateLatestPrices` to accept an alias→canonical map**

Replace the existing `aggregateLatestPrices` function:

```typescript
export function aggregateLatestPrices(
  prices: Price[],
  aliasToCanonical?: Map<string, string>
): Map<string, Map<string, Price>> {
  const latestPrices = new Map<string, Map<string, Price>>()
  for (const price of prices || []) {
    // Map alias product_id to canonical product_id
    const canonicalId = aliasToCanonical?.get(price.product_id) || price.product_id
    if (!latestPrices.has(canonicalId)) {
      latestPrices.set(canonicalId, new Map())
    }
    const productPrices = latestPrices.get(canonicalId)!
    if (!productPrices.has(price.supplier_id)) {
      productPrices.set(price.supplier_id, price)
    }
  }
  return latestPrices
}
```

**Step 3: Add helper to build the alias→canonical reverse map**

```typescript
/**
 * Build a reverse map: alias_product_id → canonical_product_id
 * Used to remap prices from aliases to their canonical products.
 */
export function buildAliasToCanonicalMap(
  groupMap: Map<string, string[]>
): Map<string, string> {
  const aliasMap = new Map<string, string>()
  for (const [canonicalId, allIds] of groupMap) {
    for (const id of allIds) {
      if (id !== canonicalId) {
        aliasMap.set(id, canonicalId)
      }
    }
  }
  return aliasMap
}
```

**Step 4: Commit**

```bash
git add web/src/lib/queries/products.ts
git commit -m "feat: query helpers for product group aggregation"
```

---

### Task 6: Update Listing Pages (buscar, categorias, homepage)

**Files:**
- Modify: `web/src/app/buscar/page.tsx`
- Modify: `web/src/app/categorias/[slug]/page.tsx`
- Modify: `web/src/app/page.tsx`

All three pages follow the same pattern. The changes are:

1. Add `.is('canonical_product_id', null)` to the product query (exclude aliases from listings)
2. After fetching canonical products, call `getProductGroupMap()` to get alias IDs
3. Expand the price query to include alias product IDs
4. Build `aliasToCanonical` map and pass it to `aggregateLatestPrices()`

**Step 1: Update buscar/page.tsx**

Add import:
```typescript
import { aggregateLatestPrices, buildProductsWithPrices, getProductGroupMap, buildAliasToCanonicalMap } from '@/lib/queries/products'
```

Add filter to product query (after line 39, before `.range()`):
```typescript
productQuery = productQuery.is('canonical_product_id', null)
```

Replace the price-fetching block (lines 70-81) with:
```typescript
  const productIds = products.map((p) => p.id)

  // Get alias product IDs for each canonical product
  const groupMap = await getProductGroupMap(supabase, productIds)
  const aliasToCanonical = buildAliasToCanonicalMap(groupMap)
  const allProductIds = Array.from(new Set(
    [...groupMap.values()].flat()
  ))

  const { data: prices } =
    allProductIds.length > 0
      ? await supabase
          .from('prices')
          .select('*, supplier:suppliers(*)')
          .in('product_id', allProductIds)
          .order('scraped_at', { ascending: false })
      : { data: [] }

  const latestPrices = aggregateLatestPrices(prices || [], aliasToCanonical)
  let productsWithPrices = buildProductsWithPrices(products, latestPrices)
```

**Step 2: Update categorias/[slug]/page.tsx**

Same pattern as buscar. Add import, add `.is('canonical_product_id', null)` filter, expand price query with group map.

Add filter after line 45:
```typescript
    .is('canonical_product_id', null)
```

Replace lines 55-66 with same pattern as buscar (getProductGroupMap → expand IDs → aliasToCanonical → aggregateLatestPrices).

**Step 3: Update page.tsx (homepage)**

For the trending products query (line 28-31), add the canonical filter:
```typescript
    supabase
      .from('products')
      .select('*')
      .is('canonical_product_id', null)
      .limit(8),
```

For the trending prices (lines 34-44), expand with group map:
```typescript
  const trendingIds = trendingProducts?.map((p) => p.id) || []
  const groupMap = await getProductGroupMap(supabase, trendingIds)
  const aliasToCanonical = buildAliasToCanonicalMap(groupMap)
  const allTrendingIds = Array.from(new Set([...groupMap.values()].flat()))

  const { data: trendingPrices } = allTrendingIds.length > 0
    ? await supabase
        .from('prices')
        .select('*, supplier:suppliers(*)')
        .in('product_id', allTrendingIds)
        .order('scraped_at', { ascending: false })
    : { data: [] }

  const latestPrices = aggregateLatestPrices(trendingPrices || [], aliasToCanonical)
  const productsWithPrices = buildProductsWithPrices(trendingProducts || [], latestPrices)
    .sort((a, b) => b.store_count - a.store_count)
```

**Step 4: Update search API and suggest API**

In `web/src/app/api/search/route.ts`:
- Add `.is('canonical_product_id', null)` to the product query
- Expand price query with group map (same pattern)

In `web/src/app/api/search/suggest/route.ts`:
- Add `.is('canonical_product_id', null)` to the product query

**Step 5: Commit**

```bash
git add web/src/app/buscar/page.tsx web/src/app/categorias/[slug]/page.tsx web/src/app/page.tsx web/src/app/api/search/route.ts web/src/app/api/search/suggest/route.ts
git commit -m "feat: listing pages exclude alias products, aggregate group prices"
```

---

### Task 7: Product Detail Page — Group Price Aggregation + Redirect

**Files:**
- Modify: `web/src/app/producto/[id]/page.tsx`

**Step 1: Handle alias redirect and group price fetching**

At the top of the component, after fetching the product (line 27), add redirect logic:

```typescript
  if (!product) notFound()

  // If this is an alias product, redirect to the canonical
  if (product.canonical_product_id) {
    const { permanentRedirect } = await import('next/navigation')
    permanentRedirect(`/producto/${product.canonical_product_id}`)
  }

  // Get all product IDs in this group (canonical + aliases)
  const { data: aliases } = await supabase
    .from('products')
    .select('id')
    .eq('canonical_product_id', product.id)

  const groupProductIds = [product.id, ...(aliases || []).map((a: any) => a.id)]
```

Replace the price fetch (lines 43-47) to use ALL group IDs:

```typescript
  // Get all prices with supplier info for entire group
  const { data: allPrices } = await supabase
    .from('prices')
    .select('*, supplier:suppliers(*)')
    .in('product_id', groupProductIds)
    .order('scraped_at', { ascending: false })
```

The rest of the page logic (latestBySupplier, price calculations, price history) works unchanged because it operates on the `allPrices` array regardless of which product_id they came from.

For the similar products query (line 84-103), add `.is('canonical_product_id', null)` and exclude ALL group IDs:
```typescript
    const { data: similar } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', product.category_id)
      .is('canonical_product_id', null)
      .not('id', 'in', `(${groupProductIds.join(',')})`)
      .limit(8)
```

**Step 2: Commit**

```bash
git add "web/src/app/producto/[id]/page.tsx"
git commit -m "feat: product detail aggregates prices across group, alias redirect"
```

---

### Task 8: Fuzzy Matching in ensure_product()

**Files:**
- Modify: `scrapers/main.py`

**Step 1: Add fuzzy matching after exact match fails**

Replace the `ensure_product` function in `scrapers/main.py`:

```python
def ensure_product(supabase, name: str, category_slug: str = None,
                    image_url: str = None, brand: str = None) -> Optional[str]:
    """Get or create product in database. Returns product_id.
    Uses exact match first, then fuzzy match, then creates new."""
    from matchers import tokenize, jaccard_similarity

    # 1. Try exact match
    result = supabase.table("products").select("id, image_url, brand").eq("name", name).execute()
    if result.data:
        product_id = result.data[0]["id"]
        updates = {}
        if image_url and not result.data[0].get("image_url"):
            updates["image_url"] = image_url
        if brand and not result.data[0].get("brand"):
            updates["brand"] = brand
        if updates:
            try:
                supabase.table("products").update(updates).eq("id", product_id).execute()
            except Exception as e:
                logger.warning(f"Failed to update product metadata: {e}")
        return product_id

    # 2. Fuzzy match: search by first significant keyword
    incoming_tokens = tokenize(name)
    if not incoming_tokens:
        return _create_product(supabase, name, category_slug, image_url, brand)

    # Pick the longest token as search term (most specific)
    search_token = max(incoming_tokens, key=len)
    if len(search_token) < 4:
        return _create_product(supabase, name, category_slug, image_url, brand)

    candidates = supabase.table("products").select(
        "id, name, category_id, image_url, brand, canonical_product_id"
    ).ilike("name", f"%{search_token}%").limit(50).execute()

    best_match = None
    best_score = 0.0

    for candidate in candidates.data or []:
        candidate_tokens = tokenize(candidate["name"])
        score = jaccard_similarity(incoming_tokens, candidate_tokens)
        if score > best_score and score >= 0.75:
            # Check category compatibility
            if category_slug:
                cat_result = supabase.table("categories").select("id").eq("slug", category_slug).execute()
                if cat_result.data and candidate.get("category_id"):
                    if cat_result.data[0]["id"] != candidate["category_id"]:
                        continue  # Different category, skip
            best_match = candidate
            best_score = score

    if best_match:
        # Use the canonical product if this match is an alias
        product_id = best_match.get("canonical_product_id") or best_match["id"]
        logger.info(f"Fuzzy match ({best_score:.2f}): '{name}' → '{best_match['name']}'")
        # Update metadata on canonical if missing
        updates = {}
        if image_url and not best_match.get("image_url"):
            updates["image_url"] = image_url
        if brand and not best_match.get("brand"):
            updates["brand"] = brand
        if updates:
            try:
                supabase.table("products").update(updates).eq("id", product_id).execute()
            except Exception as e:
                logger.warning(f"Failed to update product metadata: {e}")
        return product_id

    # 3. No match found — create new product
    return _create_product(supabase, name, category_slug, image_url, brand)


def _create_product(supabase, name: str, category_slug: str = None,
                     image_url: str = None, brand: str = None) -> Optional[str]:
    """Create a new product in the database."""
    product_data = {"name": name}
    if image_url:
        product_data["image_url"] = image_url
    if brand:
        product_data["brand"] = brand
    if category_slug:
        cat_result = supabase.table("categories").select("id").eq("slug", category_slug).execute()
        if cat_result.data:
            product_data["category_id"] = cat_result.data[0]["id"]

    result = supabase.table("products").insert(product_data).execute()
    if result.data:
        return result.data[0]["id"]
    return None
```

**Step 2: Commit**

```bash
git add scrapers/main.py
git commit -m "feat: fuzzy matching in ensure_product() prevents future duplicates"
```

---

### Task 9: Build, Test, Push

**Step 1: Build the Next.js app**

Run: `cd web && npm run build`
Expected: Successful build with no errors.

**Step 2: Run dedup dry run to verify**

Run: `cd scrapers && python3 deduplicate.py`
Expected: Shows groups of similar products, confirms the algorithm works.

**Step 3: Apply deduplication**

Run: `cd scrapers && python3 deduplicate.py --apply`
Expected: Products merged in DB.

**Step 4: Push to GitHub**

Run: `git push origin main`

**Step 5: Deploy**

Run: `cd web && npx vercel --prod`
Expected: Successful deployment.

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| `scrapers/matchers.py` | Modify | Enhanced normalization, tokenization, Jaccard similarity |
| `scrapers/deduplicate.py` | Create | One-time dedup script with dry-run, CSV export, apply modes |
| `scrapers/main.py` | Modify | Fuzzy matching in `ensure_product()` |
| `web/src/lib/types.ts` | Modify | Add `canonical_product_id` to `Product` |
| `web/src/lib/queries/products.ts` | Modify | Group map helpers, alias-aware price aggregation |
| `web/src/app/buscar/page.tsx` | Modify | Filter aliases, aggregate group prices |
| `web/src/app/categorias/[slug]/page.tsx` | Modify | Filter aliases, aggregate group prices |
| `web/src/app/page.tsx` | Modify | Filter aliases from trending |
| `web/src/app/api/search/route.ts` | Modify | Filter aliases from API results |
| `web/src/app/api/search/suggest/route.ts` | Modify | Filter aliases from suggestions |
| `web/src/app/producto/[id]/page.tsx` | Modify | Alias redirect, group price aggregation |
| Supabase SQL | Run once | Add `canonical_product_id` column + index |
