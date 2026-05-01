# Supplier Onboarding Playbook

Status: Planned (Track 2). Last meaningful edit: 2026-04-30.

This playbook applies once we move from price-comparison to marketplace. Until Track 2 ships, supplier relationships are passive — we scrape their public catalog, send them traffic via referral links, and have no contractual relationship.

## Pilot supplier criteria

For the marketplace pilot (Track 2), we onboard 3-5 suppliers in this order. Selection criteria:

1. **Catalog coverage.** Supplier's catalog spans multiple high-traffic categories (resinas, anestesia, fresas, implantes, limas at minimum).
2. **Existing relationship.** Pablo has a personal or commercial relationship with the supplier's leadership. Cold-outreach starts later.
3. **Operational competence.** Supplier already ships in 1-3 days, accepts standard returns, has a person who answers email within 24h.
4. **Commercial appetite.** Supplier sees the volume opportunity and is willing to pilot a take-rate arrangement.
5. **Risk tolerance.** Supplier is willing to be referenced publicly as a pilot partner (this becomes a marketing asset for both sides).

Initial pilot targets (subject to revision based on traffic data and Pablo's relationships):

- **Mayordent** — broad catalog, mid-market pricing, good editorial relationship.
- **Surdent** — strong in fresas/diamantes, regional southern coverage.
- **Dental Depot** — competitive pricing across multiple categories.
- **AF Chile SPA** — high oferta volume, possible promotional partner.
- **Dentobal** — clinical-supplies broad inventory.

## Commercial terms (pilot defaults)

- **Take rate:** 8-10% of transaction value (excluding shipping and VAT) for the pilot. Reviewable at month 6.
- **Payment terms to supplier:** T+15 days from order ship-confirmation. Net of take rate, refunds, and chargebacks.
- **Shipping:** Supplier handles shipping, charges the dentist directly within the cart total. We do not mark up shipping. If the supplier wants to offer free shipping over a threshold, we surface that.
- **Returns:** Per supplier's existing return policy, surfaced clearly on the product detail page. Refunds initiated by us, debited from next supplier payout.
- **Stock-out commitment:** Supplier marks stock as out-of-stock in the data we ingest. If a stock-out occurs after order acceptance, supplier compensates the dentist (replacement supplier, expedited shipping, or refund) at the supplier's cost. Stock-out rate is monitored; sustained issues are a renegotiation trigger.
- **SLA for fulfillment confirmation:** Supplier acknowledges new orders within 4 business hours and ships within 2 business days. Misses are tracked.

These are starting positions. Real terms negotiated per supplier.

## Onboarding sequence

### Phase 1 — Pre-contract (week 1-2)

- Pablo or a designated ops lead has the introductory conversation with supplier leadership.
- Walk through the marketplace value proposition: incremental volume, no upfront cost, brand exposure.
- Walk through the operational asks: order ack, ship-by SLA, return-handling, stock-out commitment.
- Walk through the commercial terms: take rate, payment cadence, exclusivity (none required).
- Get verbal alignment before involving lawyers.

### Phase 2 — Contracting (week 2-4)

- Send the supplier-agreement template (in `legal-private/templates/`, in the private docs repo).
- Negotiate edits.
- Sign. Both parties retain a copy. Signed contract goes into the private docs repo, not the public one.

### Phase 3 — Technical onboarding (week 3-6)

In parallel with contracting once verbal alignment exists:

- Provision a supplier portal account at `app.dentalprecios.cl/supplier/<slug>` (Track 2 feature). Until the portal exists, orders flow via email.
- Configure the supplier in our system: tax ID (RUT), bank info (for payouts), shipping zones, return policy URL, shipping cost ranges.
- Verify product catalog: confirm SKU mappings between our normalized catalog and the supplier's internal SKUs. Resolve discrepancies.
- Test order flow end-to-end with a $100 USD test transaction (we cover the cost).
- Verify return flow with a test return.

### Phase 4 — Soft launch (week 6-8)

- Enable the supplier as a fulfillment option for a single category (e.g., resinas) or a single product family.
- Monitor every order. Daily standup with the supplier ops contact.
- Track: ack time, ship time, stock-out incidents, customer complaints.
- After 2 weeks of clean data, expand to the supplier's full catalog.

### Phase 5 — Steady state

- Weekly metrics review with supplier (volume, take rate, exceptions).
- Monthly statement and payout.
- Quarterly relationship review (pricing, catalog expansion, joint marketing).

## Reasons we offboard a supplier

The contract is mutually terminable with 30-day notice. We initiate offboarding for:

- Persistent SLA misses (ack time, ship time, stock-out rate) after a documented improvement plan.
- Customer complaints about product quality or supplier service that are not resolved.
- Material misrepresentation in the catalog (counterfeit risk, incorrect product specs).
- Failure to honor returns or refunds at the supplier's cost when warranted.
- Privacy violation: supplier accesses or attempts to access dentist data beyond what is necessary to fulfill the order.

Offboarding triggers a review of all open orders to ensure they ship before the supplier's catalog goes inactive on the site.

## Documentation per supplier

For each supplier we maintain (in the private docs repo, not here):

- Signed contract (PDF).
- Tax and banking info (encrypted).
- Operational contact details.
- SLA performance log.
- Monthly statements.
- Communication log for material incidents.

## Anti-patterns to avoid

- **Promising exclusivity to one supplier per category.** Pricing transparency is the value. Multiple suppliers per SKU is a feature.
- **Negotiating take rates per category.** Uniform take rate per supplier across all their listings is simpler and signals fairness. Volume tiers are fine; per-category isn't.
- **Letting suppliers see other suppliers' prices through the platform.** They already see what we surface publicly; they should not get insight into rivals' performance via our internal systems.
- **Allowing supplier marketing pixels on dentalprecios.cl.** Our trust commitment is no third-party tracking. Supplier asks for retargeting pixels on their product pages get declined.
- **Letting a supplier dictate which competitors we list.** We are price-transparent and supplier-neutral. A supplier asking us to delist a rival is a renegotiation trigger.

## When to write the next version of this playbook

After the third pilot supplier is operational and we have 60 days of order data, this playbook is rewritten with the lessons learned. Concrete trigger: $100k CLP cumulative GMV across pilot suppliers, or 90 days from first pilot order, whichever comes first.
