# Vision

Status: Active. Last meaningful edit: 2026-04-30.

## What DentalPrecios is today

A price-comparison platform for dental supplies in Chile. We aggregate prices from 70+ Chilean dental distributors, normalize SKUs, surface the cheapest in-stock offer, and route the dentist to the supplier's website to complete the purchase. We do not process transactions. The business today is a discovery layer.

## What DentalPrecios is becoming

The discovery layer is necessary but not sufficient. The same shift that is happening in consumer commerce (agents that buy things on a user's behalf, with stored credentials and scoped authorization) is going to happen in B2B procurement. The dentist who today opens a tab to compare prices will, within 18-24 months, ask an AI agent for the same answer and increasingly expect the agent to complete the purchase.

DentalPrecios's strategic position is to be the canonical source the agent queries, and eventually the merchant the agent transacts with. That requires two parallel transformations:

1. **Become agent-readable.** Structured catalog data, machine-friendly APIs, real-time stock signals, stable SKU resolution. The substrate that makes us the answer when an agent asks "where is the cheapest Empress Direct Enamel A2 in Chile."

2. **Become the merchant of record.** Single checkout on dentalprecios.cl regardless of which supplier fulfills. Stripe-rail payments. Marketplace fee on every transaction. The infrastructure that turns "go to supplier website" into "buy here, we ship from supplier."

Without (1), generic browser agents (OpenAI Operator, Anthropic equivalents) will treat us as one of many price sources and the value accrues to whoever has the best agent. Without (2), the agent flow is brittle and the unit economics never work, because any margin lives at the supplier we redirect to.

## Why this is defensible

Three structural advantages that compound:

- **Catalog and SKU-resolution work.** We have already done five years' worth of normalizing 22,400+ dental products across 70 distributors. The hardest part of agent-readability for this category is "the dentist said Empress Direct Enamel A2 — is that the 5g syringe, the 25g, or the 4-pack?" We have the resolution layer. A new entrant has to rebuild it.

- **Editorial trust with the dentist audience.** The blog, GBP, social presence, Pablo's NYU and clinical credibility — all of it makes DentalPrecios the trusted name when a Chilean dentist evaluates "where do I buy this." That trust transfers from "site I open to compare" to "agent I authorize to buy."

- **Time-bounded supplier dependency.** The 70 suppliers tolerate being indexed because we send them traffic. Once we are the merchant, the relationship inverts: they tolerate the take rate because we send them sales they would not otherwise close. That inversion only happens once we are processing real transactions.

## Why this is risky

Three failure modes worth surfacing:

- **Suppliers refuse the marketplace deal.** If we can't negotiate drop-ship terms with at least 3-5 of the top suppliers at acceptable take rates, Track 2 stalls and Track 3 has nothing to plug into. Mitigation: pilot with the most-cooperative first, prove the volume, use that as proof for the holdouts.

- **Agent commerce takes longer than expected to become real demand.** Possible the dentist habit of "I open three tabs to compare" persists for years longer than the technology curve suggests. Mitigation: Track 1 (agent-readable layer) has standalone SEO/discovery value even with zero agent traffic. Track 2 (marketplace) creates revenue independent of the agent thesis. The bet doesn't require the agent flow to materialize on schedule.

- **Regulatory / data sensitivity.** Chilean Ley 21.719 (effective Dec 2026) tightens data protection in ways that affect any platform handling B2B procurement data. Mitigation: privacy-first architecture from day one. See `privacy/`.

## What this is not

- Not a B2C site. Patients are not the audience. Dentists, clinic owners, and dental laboratories are.
- Not a consumer agent product (a Claude or ChatGPT replacement). We are a vertical merchant the agents transact with, plus a thin agent-discovery layer for the dentist who does not yet have an agent.
- Not pan-LATAM at launch. Chile first, then Mexico/Colombia/Argentina once the marketplace pattern is stable in one market.
- Not a clinical decision-support tool. We do not recommend "you should use Filtek instead of Tetric." We surface price for the SKU the dentist already chose.
