# Data Classification

Status: Active. Last meaningful edit: 2026-04-30.

This document maps every category of data DentalPrecios handles to a sensitivity tier and a retention policy. New data fields cannot be added to the system without classification here.

## Sensitivity tiers

- **Tier 0 (Public).** Data we publish on our website. Anyone can see it. Loss is not a privacy event.
- **Tier 1 (Internal).** Operational data that is not public but is not personal. Loss is a competitive concern, not a privacy concern.
- **Tier 2 (Personal).** Data that identifies an individual or could be combined with other data to identify them. Loss is a privacy event and may require notification under Chilean Ley 21.719.
- **Tier 3 (Sensitive Personal).** Special-category data: health, biometric, financial detail beyond what's needed for the transaction. Loss requires notification and triggers regulatory review. We try not to hold any Tier 3 data at all.

## Inventory

### Tier 0 — Public

| Category | Source | Retention |
|---|---|---|
| Product catalog (name, brand, description, image, category) | Scraper from supplier sites | Indefinite, with stale records pruned after 90 days off-catalog |
| Supplier directory (name, public website, public logo) | Scraper + manual curation | Indefinite while supplier is active |
| Price history (per product per supplier per scrape) | Scraper | 24 months rolling |
| Blog posts and editorial content | Internal | Indefinite |

### Tier 1 — Internal

| Category | Source | Retention |
|---|---|---|
| Scraper logs (request/response from supplier sites) | Scraper jobs | 30 days |
| Internal analytics (page views, search queries — anonymized) | Web analytics | 24 months |
| API request logs (path, status, latency, IP truncated to /24) | API gateway | 90 days |
| Operational alerts and incidents | Internal | Indefinite for post-mortems |

### Tier 2 — Personal

The following all currently live in or are planned for the DentalPrecios system. All Tier 2 data is access-logged and accessible only to authenticated staff with an active operational reason.

| Category | Where stored | Retention | Track introduced |
|---|---|---|---|
| Dentist account: name, email, RUT, clinic name, clinic address, phone | Supabase `dentists` table (planned) | Until account deletion, or 6 years after last transaction (Chilean tax law) | Track 2 |
| Dentist authentication: email, hashed password, password reset tokens | Supabase Auth | Until account deletion | Track 2 |
| Stripe customer ID, payment method tokens (NOT card numbers) | Supabase `payment_methods` table | Until detached or account deletion | Track 2 |
| Order records: dentist ID, line items, supplier, ship address, status | Supabase `orders`, `order_items` | 6 years (Chilean tax law); then archived encrypted; deleted at 10 years | Track 2 |
| Customer support correspondence | Help desk tool (TBD) | 24 months from last interaction | Track 2 |
| Free-text agent queries (when retention is opt-in) | Supabase, encrypted at rest | 90 days default; user-configurable | Track 1 (default ephemeral) |
| API keys issued to partner organizations | Supabase `api_keys` | Until revoked or org disengages | Track 1 |

### Tier 3 — Sensitive Personal

We attempt to hold no Tier 3 data. The categories below describe data we explicitly do not collect, with a note on what we do if it appears anyway.

| Category | Policy |
|---|---|
| Patient names, ages, conditions, treatment notes | Not collected. If a dentist mentions patient context in an agent conversation, the retention pipeline scrubs it before storage. Even with retention opt-in, the scrub runs. |
| Card numbers, CVCs, full bank account details | Not collected. Stripe holds. |
| Biometric data (face, fingerprint) | Not collected. Photo uploads are scanned for incidentally captured face data and cropped at upload. |
| Health information about dentists themselves | Not collected. |
| Government ID images beyond the RUT number | Not collected. RUT is required for Chilean tax invoicing on transactions; the number is sufficient, no image of the cédula. |

## Retention enforcement

Retention deadlines are enforced by a scheduled job (`web/scripts/retention-sweep.ts`, to be created in Track 2) that runs nightly:

- Identifies records past their retention window.
- Hard-deletes records subject to deletion.
- Archives records subject to legal retention (orders, invoices) into a separate encrypted store with restricted access.
- Logs the count of records affected to the operations channel.

Records under active legal hold (a regulatory inquiry or litigation hold) are flagged and excluded from retention sweeps until the hold is lifted.

## Right to access and delete

A dentist has the right to:

- Export their full personal data record in JSON via a self-serve account page.
- Delete their account and all associated Tier 2 data, except records subject to the 6-year Chilean tax retention rule (which remain in the archived encrypted store, inaccessible to the operational system).
- Correct any incorrect personal data on their account.

Deletion requests are handled within 30 calendar days, per the new Ley 21.719 framework.

## Cross-border transfer

Data is stored in `sa-east-1` (São Paulo, Brazil). Transfers within the Stripe pipeline (CL → US for processing) are governed by Stripe's data-processing terms. We do not perform additional cross-border transfers without specific consent. Backups are stored in the same region as production.

## Vendor-held data

The full vendor inventory is in `privacy/04-vendor-inventory.md` (to be created). Each vendor has a documented data-processing agreement, a list of fields we share with them, and a documented purpose. Vendors:

- **Stripe** — payment processing (Tier 2/3 financial)
- **Supabase** — database hosting (all tiers)
- **Vercel** — application hosting and edge logs (Tier 1)
- **Resend or equivalent** — transactional email (Tier 2 email + content)
- **Customer support tool (TBD)** — support correspondence (Tier 2)
- **Sentry or equivalent** — error monitoring (Tier 1; PII scrubbed before send)
- **Google Analytics or Plausible** — web analytics (anonymized; we prefer Plausible to avoid identifying cookies)

## Updates to this document

Adding a new data field requires updating this document in the same PR that adds the field. A PR that introduces personal-data handling without a corresponding update here does not pass review.
