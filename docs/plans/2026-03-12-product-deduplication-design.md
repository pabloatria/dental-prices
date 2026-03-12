# Product Deduplication Design

## Problem

Same product from different suppliers gets different names, creating separate DB entries.
Example: "Clinpro Clear 100 Unidosis", "Clinpro Clear x 100 Uds, 3M", "Clinpro Clear Fluoruro de Sodio 2.1% 100 uds 3M Solventum" are all the same product but appear as 3 separate cards.

## Solution

Add `canonical_product_id` column to products table. Duplicate products point to a canonical (primary) product. Queries aggregate prices across the entire group.

### Data Model Change

```sql
ALTER TABLE products ADD COLUMN canonical_product_id UUID REFERENCES products(id);
CREATE INDEX idx_products_canonical ON products(canonical_product_id);
```

- `canonical_product_id = NULL` means the product IS canonical (or ungrouped)
- `canonical_product_id = <some_id>` means this is an alias that should be merged into that canonical product

### Part 1: Deduplication Script (one-time cleanup)

Python script `scrapers/deduplicate.py`:

1. Fetch all products from DB
2. Normalize names: lowercase, strip brand prefixes/suffixes, normalize quantities ("x 100", "100 uds", "100 unidades" etc.), remove TM symbols, strip HTML entities
3. Group by token-based similarity (Jaccard on word tokens):
   - Auto-merge: similarity > 0.8 AND same category
   - Review needed: similarity 0.6-0.8 (output to CSV)
   - No match: < 0.6
4. For each group, pick canonical = shortest/cleanest name
5. Set `canonical_product_id` on all non-canonical members
6. Output summary: groups found, auto-merged, needs-review

### Part 2: Fuzzy Matching in ensure_product()

Modify `scrapers/main.py`:

1. After exact match fails, normalize the incoming name
2. Search DB for products with similar normalized names (use pg_trgm or fetch candidates by first significant word)
3. Compare with Jaccard similarity on tokens
4. If match > 0.8 AND same category: reuse existing product_id
5. If no match: create new product as before

### Part 3: Frontend Query Changes

Modify `web/src/lib/queries/products.ts`:

1. When fetching products for listing: only show canonical products (WHERE canonical_product_id IS NULL)
2. When aggregating prices: include prices from all alias products in the group
3. Product detail page: fetch prices from canonical + all aliases
4. Search: search across all names but redirect/display canonical

### Canonical Name Selection

Auto-select the shortest name from the group that still contains the brand. This avoids overly verbose supplier-specific names.

### Decisions

- Approach: Automatic with review CSV for edge cases
- Naming: Auto-pick shortest/cleanest name as canonical
- Scope: Clean existing duplicates AND prevent future ones via fuzzy ensure_product()
- Reversible: canonical_product_id can be set to NULL to "unmerge"
