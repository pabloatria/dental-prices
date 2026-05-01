# System Overview

Status: Active. Last meaningful edit: 2026-04-30.

A snapshot of how DentalPrecios is built today and the target shape across the three tracks.

## Today (April 2026)

```
                  ┌─────────────────────────────┐
                  │   Chilean dental distributors│
                  │     (70 active suppliers)   │
                  └──────────────┬──────────────┘
                                 │ HTML / public catalogs
                                 ▼
                  ┌─────────────────────────────┐
                  │     Scraper (GitHub Actions)│
                  │     scrape.yml, daily       │
                  └──────────────┬──────────────┘
                                 │ writes prices, products
                                 ▼
                  ┌─────────────────────────────┐
                  │       Supabase (Postgres)   │
                  │       sa-east-1             │
                  │  • products (22.4k)         │
                  │  • prices                   │
                  │  • suppliers (71 active)    │
                  │  • categories               │
                  │  • RPCs (server fns)        │
                  └──────────────┬──────────────┘
                                 │ anon-key reads
                                 ▼
                  ┌─────────────────────────────┐
                  │    Next.js 16 (App Router)  │
                  │    Vercel (production)      │
                  │  • dentalprecios.cl         │
                  │  • ISR cache, 15-60min      │
                  │  • JSON-LD schema injected  │
                  └──────────────┬──────────────┘
                                 │ HTTP, public
                                 ▼
                  ┌─────────────────────────────┐
                  │  Dentists, agents, search   │
                  │  engines, AI Overview       │
                  └─────────────────────────────┘
```

Components:

- **Scraper.** GitHub Actions workflow `scrape.yml` runs daily at randomized offset, pulls public catalog data from supplier sites, normalizes, and upserts into Supabase. Per-supplier configs in YAML.
- **Database.** Supabase Postgres in `sa-east-1`. Tables: `products`, `prices`, `suppliers`, `categories`. Server-side RPCs for cross-cutting queries (`get_latest_prices_for_products`, `get_category_product_counts`, `get_latest_offers_distinct`).
- **Web app.** Next.js 16 App Router, deployed on Vercel. Server-rendered with ISR. JSON-LD Product/Offer schema on key pages. No authentication. No cart.
- **Public surface.** dentalprecios.cl + blog (39 MDX posts) + category pages + product detail + offers feed.

What we do not have today:

- No dentist accounts.
- No payment processing.
- No order management.
- No agent-facing API or MCP server.
- No Stripe integration.
- No supplier login or dashboard.

## Target end state (after Track 3)

```
                  ┌─────────────────────────────┐
                  │   Chilean dental distributors│
                  └──────────────┬──────────────┘
                                 │ HTML/feed (scraper)
                                 │ + fulfillment integration (Track 2)
                                 ▼
                  ┌─────────────────────────────┐
                  │       Supabase (Postgres)   │
                  │   + dentists, accounts      │
                  │   + orders, payments        │
                  │   + agent_sessions          │
                  └──────────────┬──────────────┘
                                 │
              ┌──────────────────┼─────────────────────┐
              ▼                  ▼                     ▼
   ┌──────────────────┐ ┌─────────────────┐ ┌────────────────────┐
   │ Web app          │ │ MCP server      │ │ Stripe + Atlas     │
   │ (Next.js)        │ │ mcp.dental...   │ │ • Payment intent   │
   │                  │ │ + REST API      │ │ • Link wallet      │
   │ Cart, checkout,  │ │ + agent tools   │ │ • Restricted keys  │
   │ orders, account  │ │                 │ │ • Webhooks         │
   └──────────────────┘ └─────────────────┘ └──────────┬─────────┘
            │                    │                     │
            │                    │                     │
            ▼                    ▼                     ▼
   ┌──────────────────┐ ┌─────────────────┐ ┌────────────────────┐
   │ Dentist          │ │ External AI     │ │ Banks (CL + US)    │
   │ (browser)        │ │ agents (Claude, │ │                    │
   │                  │ │ ChatGPT, custom)│ │                    │
   └──────────────────┘ └─────────────────┘ └────────────────────┘
```

Components added across the three tracks:

**Track 1 (months 1-2):**
- MCP server at `mcp.dentalprecios.cl`.
- REST fallback at `api.dentalprecios.cl/v1/`.
- Search index (Postgres tsvector + trigram) for SKU resolution.
- Rate limiting and API key issuance.
- Documentation site at `docs.dentalprecios.cl`.

**Track 2 (months 3-9):**
- Dentist authentication (Supabase Auth or NextAuth).
- Cart and checkout flow.
- Stripe integration via US LLC (Stripe Atlas).
- Order management: split-by-supplier, fulfillment notifications, status tracking.
- Supplier portal: receive orders, mark shipped, manage catalog (initially just receiving notifications by email).
- Customer support: WhatsApp + ticketing tool.
- Returns and refunds.
- Internal accounting: GMV, take rate, supplier reconciliation, monthly statements.

**Track 3 (months 9-18):**
- Stripe Link wallet integration for stored credentials.
- Per-agent restricted API keys with spending caps.
- Authorization model: trusted-merchant scope, per-transaction limits, optional human-confirm thresholds.
- `create_authorized_purchase`, `get_order_status`, `cancel_order` agent tools.
- Audit log of every agent-initiated purchase, surfaced to the dentist in their account.
- Optional human-confirm UX (SMS/WhatsApp before high-value purchases).

## Hosting and operational topology

- **Database:** Supabase, `sa-east-1` (São Paulo). Closest available region to Chile that we can self-serve. Considered moving once Supabase opens a CL region or once Ley 21.719 forces it.
- **App:** Vercel, edge nodes in `sa-east-1` and `iad1` (US East). Cache TTLs configured per route via ISR.
- **Scraper:** GitHub Actions, repo `pabloatria/dental-prices`. Runs in Microsoft-hosted runners (US/EU mix). Scraping target sites are CL.
- **Stripe:** Issued under a US LLC (via Atlas). Stripe processes in USD; we convert and display CLP for Chilean dentists.
- **Domains:** `dentalprecios.cl` (primary), planned subdomains `mcp.`, `api.`, `docs.`, `app.` (for an authenticated dashboard once Track 2 ships).
- **DNS / TLS:** Cloudflare or Vercel-managed. TLS 1.3, HSTS preload (already enabled).
- **Backups:** Supabase managed daily backups, 30-day retention. Plus weekly logical dumps to private object storage.

## Boundaries and security posture

- **Public read.** Catalog, prices, supplier directory, blog. Anonymous, no rate limit on public web pages. Rate limit on API and MCP.
- **Authenticated read.** Dentist account, order history, watchlist, saved searches. Supabase RLS policies enforce per-user access.
- **Authenticated write.** Cart updates, checkout, account changes, agent action authorizations. RLS + server-side validation + Stripe-side payment-intent verification.
- **Operator/admin.** Supplier-facing portal, fulfillment ops. Separate subdomain, separate auth, separate audit log. No service-role keys leave the server.
- **Service-role keys.** Used only by the scraper and by Vercel server functions. Never exposed to browsers, never logged, rotated quarterly. Current incident-response playbook in `security/`.

See `architecture/01-data-model.md` (to be written when Track 2 schema is designed) and `architecture/02-mcp-server-design.md` (to be written during Track 1 build).
