# API v1 Reference

Status: Active. Last meaningful edit: 2026-04-30. Track: 1 (agent-discovery layer).

The public read-only API at `https://www.dentalprecios.cl/api/v1/*`. Designed for AI agents (Claude, ChatGPT, Perplexity, custom WhatsApp bots) and partner integrations. Companion to the MCP server (planned).

## Discipline

- Read-only. No write endpoints in v1. Carts, orders, accounts are out of scope.
- No PII in request or response. The API does not accept dentist identifiers and does not return personal data.
- CORS open: `Access-Control-Allow-Origin: *`. Anyone can call from anywhere.
- Cache headers per route. Most reads are cached at the edge for 5 min (`s-maxage=300`).
- All money in CLP integers. No decimals. `42500` is forty-two thousand five hundred Chilean pesos.
- `X-Robots-Tag: noindex, nofollow` on every response so agents can scrape but search engines do not index API responses.
- Stable response shapes. Breaking changes ship as v2.

## Endpoints

### `GET /api/v1/categories`

Returns the top-level category list with product counts.

Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Resinas compuestas",
      "slug": "resinas-compuestas",
      "product_count": 653,
      "url": "https://www.dentalprecios.cl/categorias/resinas-compuestas"
    }
  ],
  "count": 33
}
```

### `GET /api/v1/products/search?q=<query>&limit=<n>&category=<slug>`

Free-text search across the catalog. Returns up to `limit` matches (default 10, max 50). Optional `category` parameter scopes the search.

Response:
```json
{
  "q": "filtek z350",
  "count": 10,
  "items": [
    {
      "id": "uuid",
      "name": "Resina Filtek Z350 XT Composite 3M",
      "brand": "3M",
      "category_id": "uuid",
      "image_url": "https://...",
      "url": "https://www.dentalprecios.cl/producto/uuid"
    }
  ]
}
```

### `POST /api/v1/products/resolve`

Disambiguation helper. Agents extract structured fragments from a free-text request and post them here; the API returns either a single canonical product (high confidence) or up to 5 candidates ranked by best match.

Request body:
```json
{
  "brand": "Ivoclar",
  "family": "Empress Direct",
  "variant": "Enamel A2",
  "pack_size": "5g"
}
```

Or, simpler:
```json
{
  "full_query": "Ivoclar Empress Direct Enamel A2 5g"
}
```

Response (high-confidence single match):
```json
{
  "resolved": true,
  "candidate_count": 1,
  "candidates": [
    {
      "id": "uuid",
      "name": "Ivoclar Empress Direct Enamel A2 5g",
      "brand": "Ivoclar Vivadent",
      "match_score": 47,
      "url": "https://www.dentalprecios.cl/producto/uuid"
    }
  ],
  "note": "high-confidence single match"
}
```

Response (ambiguous):
```json
{
  "resolved": false,
  "candidate_count": 3,
  "candidates": [
    { "id": "...", "name": "Empress Direct Enamel A2 5g", "match_score": 28 },
    { "id": "...", "name": "Empress Direct Enamel A2 25g", "match_score": 28 },
    { "id": "...", "name": "Empress Direct Enamel A2 4-pack", "match_score": 28 }
  ],
  "note": "multiple candidates; agent should ask the user to disambiguate"
}
```

The agent's expected behavior on ambiguous: ask the dentist a clarifying question (e.g., "5g syringe, 25g jar, or 4-pack?") and call `resolve` again with the additional `pack_size` token.

### `GET /api/v1/products/:id`

Full product detail. Use after `search` or `resolve` returns a canonical id.

Response:
```json
{
  "id": "uuid",
  "name": "Resina Filtek Z350 XT Composite 3M",
  "brand": "3M",
  "description": "...",
  "image_url": "https://...",
  "pack_size": null,
  "category": { "id": "...", "name": "Resinas compuestas", "slug": "resinas-compuestas" },
  "url": "https://www.dentalprecios.cl/producto/uuid"
}
```

### `GET /api/v1/products/:id/lowest-price?in_stock_only=true`

Cheapest current offer for a product. Default filters to in-stock only; pass `?in_stock_only=false` to include OOS.

Response:
```json
{
  "product_id": "uuid",
  "lowest": {
    "supplier_id": "uuid",
    "supplier_name": "Mayordent",
    "supplier_website": "https://www.mayordent.cl",
    "price": 24500,
    "currency": "CLP",
    "original_price": null,
    "discount_pct": null,
    "in_stock": true,
    "scraped_at": "2026-04-30T08:00:00Z",
    "buy_url": "https://www.mayordent.cl/producto/..."
  },
  "offer_count": 12
}
```

### `GET /api/v1/products/:id/offers?limit=<n>&in_stock_only=true`

All current offers, sorted by price ascending. Default in-stock only, default 20 offers, max 100.

Response:
```json
{
  "product_id": "uuid",
  "count": 12,
  "total_available": 12,
  "offers": [
    {
      "supplier_id": "...", "supplier_name": "Mayordent",
      "price": 24500, "currency": "CLP",
      "original_price": null, "discount_pct": null,
      "in_stock": true, "scraped_at": "...",
      "buy_url": "https://..."
    }
  ]
}
```

## Agent integration pattern

The canonical agent flow:

```
dentist: "I'm out of Empress Direct Enamel A2"
   ↓
agent extracts: brand=Ivoclar, family=Empress Direct, variant=Enamel A2
   ↓
POST /api/v1/products/resolve { brand, family, variant }
   ↓
{ resolved: false, candidates: [5g, 25g, 4-pack] }
   ↓
agent asks dentist: "5g syringe, 25g jar, or 4-pack?"
   ↓
dentist: "5g"
   ↓
agent: POST /api/v1/products/resolve with { pack_size: "5g" } added
   ↓
{ resolved: true, candidates: [{ id, ... }] }
   ↓
GET /api/v1/products/:id/lowest-price
   ↓
{ lowest: { supplier: "Mayordent", price: 24500, buy_url: "..." } }
   ↓
agent presents result to dentist with the deep link to Mayordent
```

In Track 1, the agent ends here. The dentist clicks through to Mayordent and completes the purchase manually. In Track 3, the agent calls a separate `create_authorized_purchase` endpoint (not in v1) to complete the transaction on dentalprecios.

## Rate limits

v1 is open and unauthenticated. Vercel platform-level DDoS protection is the only floor. Heavy users (partner integrations) should request an API key for a dedicated channel and a higher cap. API key issuance is manual at first; email pablo@dentalprecios.cl.

Future: edge-deployed token-bucket rate limiting (Vercel KV or Upstash Redis), default 60 req/min per IP, lifted with API key.

## Errors

All errors return JSON with shape:
```json
{ "error": "human-readable message", "detail": "optional" }
```

Standard codes: 400 (bad request), 404 (not found), 500 (server error). 429 reserved for rate-limit responses once enabled.

## Versioning

This is `v1`. Breaking changes (response shape changes, removed fields, semantic changes to existing endpoints) ship as `v2` at `/api/v2/*`. Deprecation of v1 will be announced 90 days in advance with a `Sunset` header on every v1 response.

Additive changes (new endpoints, new optional response fields) ship as v1 minor revisions and are noted in this document under a "Changelog" section.

## What is not in v1

The following are explicitly out of scope. Track 3 will introduce them.

- `create_authorized_purchase`
- `get_order_status`
- `cancel_order`
- Any endpoint requiring dentist authentication
- Webhook subscriptions (price-change alerts)
- Watchlists or saved searches
