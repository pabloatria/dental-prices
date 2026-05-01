# Privacy Principles

Status: Active. Last meaningful edit: 2026-04-30. Applies to: all DentalPrecios products and operations.

These principles are non-negotiable. They take precedence over feature requests, partner asks, and short-term commercial pressures. If a feature cannot be built within these principles, the feature is redesigned. If a business decision conflicts with these principles, the principles win.

## 1. We collect the minimum data necessary

We collect only what is required to deliver the service the user requested, plus what is required by Chilean law for tax and accounting. We do not collect "in case it's useful later." Every field in every form requires a documented purpose.

The bar is: if we can deliver the service without this data, we do not collect this data.

## 2. We never sell, share, or rent personal data to third parties

This is absolute. We do not sell purchase history, browsing behavior, agent conversation logs, contact information, clinic location, or any other personal data to suppliers, advertisers, market researchers, AI training pipelines, or anyone else. Suppliers see only the orders they fulfill, never the dentist's history with other suppliers. Investors see aggregate metrics, never individual records.

This is the founder commitment. If we ever need to revisit it, the trigger event must be explicit and the user must be re-consented in advance, not after.

## 3. We do not store payment card data

Card numbers, CVCs, expirations, and bank account details live with Stripe (or the equivalent payment processor). We store only Stripe customer IDs and tokenized payment-method references. PCI scope on our infrastructure stays at SAQ A — we never touch raw card data.

Engineering rule: if a code review finds raw card data flowing through our servers, the code does not ship.

## 4. We treat dentist purchase history as the dentist's property

The dentist's catalog of past orders, watchlists, saved searches, and price alerts is theirs. They can export it in a machine-readable format on demand. They can delete their entire account and all associated personal data (subject to the Chilean tax-record retention requirement of 6 years for transaction records). Deletion is real deletion, not soft-delete with a flag.

We do not aggregate dentist purchase history into reports we sell or share with suppliers, even in anonymized form, without explicit individual opt-in. The temptation to do this will be real once we have transaction volume; the principle holds anyway.

## 5. Agent conversation logs default to ephemeral

When dentists interact with a DentalPrecios-built or DentalPrecios-routed AI agent, the conversation log is by default not retained beyond the duration of the session. Retention is opt-in, with a clear explanation of what is retained, why, and for how long.

If a dentist mentions a patient context in conversation ("I need this for the molar I'm restoring on the 14-year-old"), our retention pipeline strips that context before any long-term storage, even with retention opt-in. We do not store patient information, full stop.

## 6. We do not collect facial or biometric data

Already a global rule. Restated here because dental imaging is adjacent to patient identity, and we may be tempted in the future (e.g., "scan the box, identify the product"). Photo-of-product is allowed; photo-of-person is not. Photo-of-product that incidentally contains a dentist's hand or face is OCR'd or cropped at upload before storage.

## 7. We honor data-residency expectations

Our database (Supabase) is currently hosted in `sa-east-1` (São Paulo). This is not Chile, but it is closer than US-East and aligns with most LATAM data-residency frameworks. Chilean Ley 21.719 (effective December 2026) introduces explicit consent and processing requirements that we treat as our floor, regardless of whether B2B procurement data is technically "sensitive" under the law.

Backup storage and any analytics warehouse follow the same residency rule unless the user has explicitly consented to a different region with a clear purpose.

## 8. Internal access is logged and minimal

Engineers and operators access dentist records only when actively working a support ticket or operations task that requires it. Every access is logged with user, timestamp, record accessed, and reason. Bulk queries against the production database that touch personal data are blocked at the database role level — there is no `SELECT * FROM dentists` for analytics. Aggregations go through reviewed, parameterized RPCs.

## 9. Vendors and processors are scrutinized

Any third-party service that processes personal data on our behalf (Stripe, Supabase, email sender, customer-support tooling, scraper hosting) is reviewed and contracted with a data-processing agreement. We do not adopt a vendor without verifying that the vendor's privacy posture is at least as strong as our own. Vendor list is documented and audited annually.

## 10. We are transparent and accept correction

The privacy policy is written in plain Spanish (and English where applicable), not in lawyer obfuscation. The full list of data categories we collect and the full list of vendors with whom data is shared (in their role as processors) is published and updated when it changes. If a dentist or third party identifies a privacy gap, we treat it as a P0 issue, not a customer-relations issue.

## Enforcement

These principles are enforced at three layers:

- **Code review.** Every PR that touches personal-data handling is reviewed against these principles. The reviewer specifically asks "does this respect Principle 1, 3, 4, 5, 8?" before approval.
- **Architectural review.** Every new feature that involves personal data has a one-page privacy impact note (template in `privacy/templates/pia-template.md`, to be created) before build starts.
- **Annual audit.** Pablo and one external advisor (legal or privacy-specialized) review the full data inventory and access logs annually. Findings result in tracked remediation tasks, not slide decks.

When a principle is violated: stop the work, document the incident in `security/`, fix the immediate issue, and run a post-incident review that produces at least one mechanism change preventing recurrence.

## Document maintenance

This document is the most stable in the repository. Changes require explicit Pablo approval and a recorded rationale. The diff history is itself the audit log. Numbering of principles is preserved across edits — new principles get appended as 11, 12, etc., never inserted. Principles are not deprecated lightly; if one is removed, the rationale and effective date are recorded in a changelog at the bottom of this file.
