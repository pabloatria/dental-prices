# Track 2 — Marketplace Pilot

Status: Planned. Target ship: 6-9 months from kickoff. Last meaningful edit: 2026-04-30.

This is a high-level placeholder. The detailed spec is written when Track 1 is in pilot and supplier conversations have produced concrete terms.

## What this track is

Single cart, single checkout, single payment on dentalprecios.cl. Behind the scenes, the cart is split by supplier and each line item is fulfilled by the chosen supplier. We are the merchant of record. Stripe processes payment. We take a marketplace fee on every transaction.

## Why this track is non-trivial

The transformation from "we redirect to suppliers" to "we are the merchant" has real operational and legal consequences:

- We become responsible for customer service on every order.
- We become the entity in the chargeback chain — Stripe pays us, we pay suppliers, dentist disputes go to us.
- We need a US merchant account (Stripe Atlas) because Stripe doesn't operate as a primary merchant in Chile. That has tax implications.
- We need to handle returns and refunds across multiple suppliers with different policies.
- We need to be insured against product issues (a defective implant ships from supplier X via our marketplace; if the dentist sues, we are in the chain).

These are not deal-breakers. They are reasons this track is 6-9 months and not 6 weeks.

## High-level shipping order

1. **Stripe Atlas LLC formation.** ~10 days.
2. **Stripe account configured.** US merchant, products listed, branding, webhook endpoints configured.
3. **Dentist authentication.** Supabase Auth, RUT-aware, email + password (passwordless option later).
4. **Account dashboard.** Order history, payment methods, addresses, support contact.
5. **Cart and checkout UI.** Single page, multi-supplier line items, address, shipping cost preview, tax calculation, payment method selection.
6. **Payment integration.** Stripe Payment Intent, success/failure handling, idempotency on retry.
7. **Order management.** On payment success, split cart by supplier, create order records, fire fulfillment notifications.
8. **Supplier portal (lightweight v1).** Email notifications + a simple authenticated page where the supplier can mark orders as shipped and provide tracking.
9. **Customer support tooling.** Initially WhatsApp + a shared inbox; eventually a help desk.
10. **Returns and refunds.** UI for the dentist to initiate a return, ops process to validate and refund.
11. **Accounting and reconciliation.** GMV reporting, take rate calculation, monthly supplier statements, monthly payouts.
12. **Tax and invoicing.** Chilean SII (Servicio de Impuestos Internos) integration for emitting electronic invoices (boletas/facturas). This is a known integration with several Chilean SaaS providers (Toku, Khipu, OpenFactura, Bsale).

## Out of scope for Track 2

- Autonomous agent purchases (Track 3).
- Inventory we own (we drop-ship from suppliers, we do not warehouse).
- Multi-currency display beyond CLP and USD.
- LATAM expansion.
- Subscription / standing-order features.

## Open questions to resolve before this track starts in earnest

- **Stripe Atlas vs. local rail.** Cost-benefit of Atlas vs. operating purely on Chilean rails (Webpay, Flow.cl) needs a concrete decision. The recommendation in this doc and the roadmap is Atlas + optional Chilean rail bridge, but the Chilean-rail-only option is viable and has lower setup overhead.
- **Tax integration partner.** Which Chilean e-invoicing SaaS we integrate with. Bsale and OpenFactura are the two top candidates. Decision is influenced by API quality and pricing per invoice.
- **Insurance.** Product liability insurance for marketplace operators in Chile. Pre-purchase a policy before launch. Quote and provider TBD.
- **Return logistics.** Do dentists ship returns to us, to the supplier directly, or to a return-processing partner? Different cost structures.

## What gets written before Track 2 starts in earnest

- `architecture/01-data-model.md` — schema additions for dentists, orders, payment methods, addresses.
- `architecture/03-stripe-integration.md` — Stripe wiring, webhook handling, idempotency strategy.
- `operations/order-fulfillment-runbook.md` — operational manual for the team handling orders day-to-day.
- `legal/supplier-agreement-template.md` (private repo) — the contract.
- `finance/unit-economics.md` (private repo) — take rate scenarios, contribution margin per order, projected breakeven.
