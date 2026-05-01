# Track 1 — MCP Server and Agent-Discovery Layer

Status: Planned. Target ship: 4-6 weeks from kickoff. Last meaningful edit: 2026-04-30.

## Goal

A production MCP (Model Context Protocol) server at `mcp.dentalprecios.cl` that any AI agent can connect to and use to: (a) resolve a dentist's natural-language product description to a canonical SKU, (b) return current cheapest in-stock offer with deep link to supplier, (c) provide structured product detail for follow-up questions.

A REST/JSON fallback at `api.dentalprecios.cl/v1/` that serves the same data for agents not yet on MCP.

## User scenarios

**Scenario A — Claude desktop user.**
Pablo the dentist has Claude desktop with the dentalprecios MCP server enabled. He types: "I'm out of Empress Direct Enamel A2." Claude calls `resolve_sku` with that string, gets back the canonical SKU and three reasonable matches in case of ambiguity, asks Pablo "did you mean the 5g syringe or the 25g jar?" Pablo confirms "5g." Claude calls `get_lowest_price` on that SKU and returns "$24.500 at Mayordent, in stock, link." Pablo clicks the link, completes the purchase manually on Mayordent. Track 1 ends here. Track 3 will eventually let Claude do the purchase too.

**Scenario B — WhatsApp bot built by a partner.**
A Chilean dental-software vendor (e.g., a clinic management SaaS) wants to add procurement to their app. They build a WhatsApp bot that calls our REST API. The dentist messages the bot "necesito brackets metálicos Roth 0.022", bot calls our API, returns the cheapest option and a button "buy at supplier." Track 1 unlocks this entire integration with zero supplier-negotiation work on our side.

**Scenario C — generic web search agent.**
An agent (Perplexity, ChatGPT browse) crawls dentalprecios.cl looking for dental supply prices. The agent reads our existing JSON-LD Product+AggregateOffer schema (which we ship today on the home page and key category pages) and surfaces dentalprecios in the answer. Track 1 extends this schema coverage to every product page and every category page so the agent gets clean, structured data wherever it lands. No MCP integration required from the agent's side.

## Tools exposed (MCP)

The MCP server exposes the following tools. Each is read-only — Track 1 does not modify any state.

### `search_products(query: string, limit: int = 10)`

Free-text search across the catalog. Returns top-N matching products with id, name, brand, category, image_url, current_lowest_price, store_count, and a confidence score.

Use case: "show me composites under $30k."

### `resolve_sku(brand: string, product_family: string, variant: string | null, pack_size: string | null)`

Disambiguation tool. Takes structured fragments (typically extracted by the agent's LLM from a free-text request) and returns a single canonical product if unambiguous, or up to 5 candidates ranked by best match if ambiguous.

Use case: dentist said "Empress Direct Enamel A2" → agent extracts brand=Ivoclar, family=Empress Direct, variant=Enamel A2, pack_size=null → tool returns three candidates (5g, 25g, 4-pack) and asks the agent to disambiguate with the dentist.

This is the most important tool. SKU resolution is where the dental-supply category is hardest, and where our normalized catalog is the deepest moat.

### `get_lowest_price(product_id: uuid, in_stock_only: bool = true)`

Returns the lowest-priced offer for a product, with supplier name, price, original_price (if oferta), discount_pct, in_stock flag, last_scrape timestamp, and direct supplier URL.

### `get_supplier_offers(product_id: uuid, limit: int = 20)`

Returns all current offers for a product, sorted by price ascending. Each offer includes supplier, price, in_stock, last_scrape, supplier URL.

### `get_product_details(product_id: uuid)`

Full product record: name, brand, description, image_url, category, related products, price history (last 30 days), supplier coverage.

### `list_categories()`

Returns the top-level category list with product counts. Useful for agents that want to scope a search.

## REST fallback (`api.dentalprecios.cl/v1/`)

Same operations exposed as REST endpoints with identical semantics:

- `GET /v1/products/search?q=...&limit=10`
- `POST /v1/products/resolve` with JSON body
- `GET /v1/products/{id}/lowest-price`
- `GET /v1/products/{id}/offers`
- `GET /v1/products/{id}`
- `GET /v1/categories`

Auth: optional API key in `Authorization: Bearer ...` header for rate-limit lift; unauthenticated rate-limited to 60 req/min per IP.

Rate limits and abuse: handled at the Vercel edge with a token bucket. Heavy users (an agent ecosystem partner) get a key that lifts the cap.

## Architecture

The MCP server is a Next.js route handler (`/api/mcp`) plus a separate Node service if MCP traffic ever justifies it. The REST fallback is also Next.js route handlers under `/api/v1/*`.

Read path goes directly to Supabase (read-only anon key, no service role). All queries use the same RPCs the web app already uses (`get_latest_prices_for_products`, `get_category_product_counts`). No new direct table reads — everything goes through stored functions for safety and uniform access logging.

`resolve_sku` is the only piece that needs new logic. Implementation:
1. Build a per-product normalized search index (Postgres tsvector over name + brand + variant tokens).
2. Use trigram + tsvector ranking to score candidates.
3. Boost exact-brand matches and exact pack-size matches.
4. Return a confidence score per candidate; agent uses that to decide whether to ask the dentist for disambiguation.

## Data model additions

None for Track 1. We use the existing `products`, `prices`, `suppliers`, `categories` tables. We may add a generated tsvector column to `products` for the search index — this is non-destructive and additive.

## SLAs

- p50 latency on `get_lowest_price`: under 100ms.
- p99 latency on `search_products` and `resolve_sku`: under 400ms.
- Stock freshness: scrape data is at most 24 hours stale (matches current scraper cadence). Track 1 does not change scraper frequency. If we want sub-hour freshness for a partner, we revisit in Track 2.
- Uptime target: 99.5% (matches Vercel + Supabase availability).

## What we explicitly do NOT do in Track 1

- No checkout, no cart, no payment. The agent gets a deep link to the supplier; the human (or a Track-3 agent) completes the purchase there.
- No dentist authentication. The MCP/API is unauthenticated for read operations (or uses an opaque API key for rate-limit purposes only). No PII is collected at this stage.
- No write operations of any kind. The agent cannot save preferences, watchlists, or anything else to dentalprecios.
- No supplier-side modifications. We do not push updates to supplier sites or accept inventory feeds in this track. We continue to scrape.

## Privacy and security implications

Track 1 handles no personal data of dentists. The only PII-adjacent risk is request logging — if we log full request bodies, we might accidentally store a dentist's free-text query that contains their name, clinic, or patient context. Mitigation:

- Do not log request bodies for natural-language queries by default.
- If we sample requests for quality monitoring, the sampling pipeline strips the query field before storage and replaces it with a length+hash signature.
- API keys (Track-1 partners only) are tied to a partner organization, not a dentist user.

See `privacy/00-privacy-principles.md` and `privacy/02-pii-handling-rules.md` for the discipline.

## Build plan

### Week 1 — Foundation
- Define MCP tool schemas. Document.
- Stand up the Next.js route handler scaffold for `/api/mcp` and `/api/v1/*`.
- Implement `get_lowest_price`, `get_supplier_offers`, `get_product_details`, `list_categories` as direct queries against existing RPCs.
- Write integration tests against staging.

### Week 2 — SKU resolution
- Build the search index (Postgres tsvector + trigram).
- Implement `resolve_sku` and `search_products`.
- Test against a 50-query benchmark covering top categories.
- Tune relevance scoring.

### Week 3 — Hardening
- Rate limiting at the edge.
- API key issuance flow (manual at first, just a Postgres table).
- Full request/response logging with PII scrubbing.
- Error monitoring (Sentry or equivalent).

### Week 4 — Documentation and pilot
- Write `docs.dentalprecios.cl` agent-integration guide.
- Pilot with one external partner (likely a Chilean dental-software vendor) — give them the spec, watch them integrate, capture feedback.
- Adjust schemas based on pilot feedback.

### Week 5-6 — Public launch
- Announce on social, blog, GBP.
- Submit to MCP server registries (Anthropic, OpenAI tooling).
- Monitor adoption.

## Out of scope (deferred to later tracks)

- `create_authorized_purchase` — Track 3.
- `get_order_status` — Track 3 (depends on Track 2 marketplace existing).
- Webhooks / push notifications when prices change — possibly Track 1.5 if a partner asks for it.
- Saved searches or watchlists per dentist — Track 3 (requires authenticated dentist accounts).

## Open questions

- Should the MCP server be open or require an API key? Recommend: open for read but rate-limited; API key gets you a higher cap and a dedicated channel for support. This lets generic agents (Claude) connect without setup but gives us visibility into partner integrations.
- Should we ship the existing JSON-LD schema everywhere alongside the MCP server, or in a separate sub-track? Recommend: in parallel, since it benefits SEO/discovery regardless of MCP adoption.
- Where does the rate-limit state live? Recommend: Vercel KV or Upstash Redis. Cheap, fast.
