# Roadmap

Status: Active. Last meaningful edit: 2026-04-30.

The build sequences across three tracks. Each track has standalone value and ships independently. Tracks 2 and 3 have hard dependencies on Track 1, but Track 1 has none on either.

## Track 1 — Agent-readable discovery layer

Goal: any AI agent (Claude, ChatGPT, Perplexity, custom WhatsApp bot, dentalprecios's own assistant) can query the catalog programmatically, resolve a dentist's natural-language product description to a canonical SKU, and return the cheapest in-stock offer with a deep link to the supplier.

Target ship: 4-6 weeks from kickoff.

What ships:
- MCP (Model Context Protocol) server at `mcp.dentalprecios.cl` exposing `search_products`, `resolve_sku`, `get_lowest_price`, `get_supplier_offers`, `get_product_details`.
- Public REST/JSON fallback API at `api.dentalprecios.cl/v1/`.
- SKU resolution layer that handles natural-language disambiguation (brand + product family + variant + pack size).
- Stock-freshness signal: pages display last-scrape timestamp; API exposes it as a field.
- Documentation site at `docs.dentalprecios.cl` with the agent-integration guide.

What does not ship in Track 1:
- Cart, checkout, or payment.
- Order management or fulfillment.
- Dentist accounts or saved-card credentials.

Success metric: at least one external agent (Claude desktop, a custom OpenAI assistant, a WhatsApp bot built by a partner) successfully queries the MCP server and routes a dentist to a supplier within the pilot window. The harder secondary metric: organic adoption — agents we did not directly pilot with start hitting the endpoint.

Why this ships first: standalone SEO/discovery value (we become the agent-canonical price source for Chilean dental supplies regardless of marketplace progress), strategic positioning (locks in the discovery layer before competitors), zero supplier-negotiation lift, no regulatory complexity (we are not yet handling money or expanded PII).

See `product/track-1-mcp-server.md` for the build spec.

## Track 2 — Marketplace pilot

Goal: 3-5 suppliers fulfilling orders that originate on dentalprecios.cl. Single cart, single checkout, single payment, fulfillment routed to the chosen supplier per line item. Marketplace fee on every transaction.

Target ship: 6-9 months from kickoff (in parallel with Track 1).

What ships:
- Single-merchant cart and checkout on dentalprecios.cl.
- Stripe US merchant account (via Stripe Atlas) accepting cards, Stripe Link, and ideally a Chilean rail bridge for CL-card preference.
- Order management: webhook-driven split of cart by supplier, fulfillment notifications to suppliers, ship-status tracking, customer-facing order page.
- Drop-ship agreements with 3-5 pilot suppliers covering the highest-traffic categories (resinas, anestesia, fresas, implantes, limas at minimum).
- Returns and refunds workflow.
- Customer support channel (initially WhatsApp, eventually a help desk).
- Internal accounting integration: GMV reporting, take-rate tracking, supplier reconciliation.

What does not ship in Track 2:
- Autonomous agent checkout.
- Subscription / standing-order features.
- Multi-currency support beyond CLP and USD.
- LATAM expansion beyond Chile.

Success metric: 50-200 transactions/month consistently for three months, take rate ≥8%, repeat purchase rate ≥30%, supplier NPS positive, dentist NPS positive.

Why this ships in parallel with Track 1: marketplace operations have a long tail (negotiations, integrations, fulfillment ops) that benefit from starting early even though the launch is later. It does not block Track 1.

See `product/track-2-marketplace-pilot.md` for the build spec.

## Track 3 — Autonomous agent checkout

Goal: a dentist's AI agent can complete a purchase on dentalprecios.cl autonomously, with stored payment credentials, scoped authorization, and configurable spending limits.

Target ship: 6-12 months after Track 2 is live and stable. Realistically 12-18 months from now.

What ships:
- Dentist account with Stripe Link wallet binding.
- Authorization model: per-agent spending caps, trusted-merchant scope, optional human-in-the-loop confirmation thresholds.
- Agent-facing purchase API tools: `create_authorized_purchase(sku, supplier, qty)`, `get_order_status(order_id)`, `cancel_order(order_id)`.
- Restricted-key issuance per agent integration.
- Audit log of every agent-initiated purchase with full traceability.
- Optional human-confirm UX (SMS/WhatsApp confirm before transactions over a configurable threshold).

What does not ship in Track 3:
- Generic browser agents that operate on supplier sites (we route everything through the marketplace).
- Cross-merchant agent identity (no attempt to be a universal dentist wallet across competitors).

Success metric: ≥5% of orders origin via agent flow within six months of launch. Zero unauthorized transactions. Customer satisfaction with the agent flow ≥ customer satisfaction with manual checkout.

See `product/track-3-agent-checkout.md` (to be written when Track 2 is in pilot).

## Sequencing summary

| Quarter | Track 1 | Track 2 | Track 3 |
|---|---|---|---|
| Q2 2026 | Build, ship | Supplier negotiations begin, Stripe Atlas setup | — |
| Q3 2026 | Iterate, monitor adoption | Build cart + checkout + first supplier integrations | Architecture spec |
| Q4 2026 | Mature | Pilot launch with 3 suppliers | Architecture spec |
| Q1 2027 | Mature | Scale to 5-10 suppliers, raise seed | Build authorization layer |
| Q2 2027 | Mature | 200+ tx/month | Pilot agent flow with 1 partner |
| Q3 2027 | Mature | LATAM expansion considered | Open agent flow to multiple integrations |

## Decision points

The roadmap has three explicit reconsider-the-bet moments:

- **End of Track 1 pilot.** If MCP server gets zero external agent traffic in the first 90 days post-launch, the agent thesis is slower than expected. Track 2 still proceeds but the messaging and fundraising narrative shifts.

- **Pilot supplier #2 onboarding.** If we cannot get a second supplier to sign drop-ship terms after the first one signs, that is a strong signal that the marketplace value proposition is weaker than the price-comparison value proposition. Track 2 should stop and we should re-architect.

- **Seed fundraise.** If a competent seed-stage investor passes despite the marketplace metrics being on plan, listen carefully to why. The most common pass reason is going to be "the agent thesis is too speculative for my fund." That is fine and useful information.
