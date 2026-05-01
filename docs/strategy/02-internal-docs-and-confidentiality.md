# Internal Documents and Confidentiality

Status: Active. Last meaningful edit: 2026-04-30.

This document explains what lives in this public repository (`pabloatria/dental-prices`) versus what must live in a separate private repository.

## The split

This repository is **public on GitHub**. Everything in `/docs/` is written assuming the world can read it. Material that should not be public goes in a separate **private** repository to be created when first needed (proposed name: `pabloatria/dental-prices-internal`).

## Lives in the public repo (`/docs/`)

- Vision, roadmap, market thesis (in their non-revealing forms).
- Architecture and data model documentation.
- Public API and MCP specifications.
- Privacy principles and data classification (publishing these is a trust feature, not a leak).
- Operational playbooks at the abstraction level (e.g., the supplier onboarding playbook in this repo describes the process; specific signed contracts live in the private repo).
- Code, schemas, scrapers, web app source.

## Lives in the private repo

- **Fundraising materials.** Pitch decks, investor lists, valuation thinking, term-sheet drafts, cap-table snapshots.
- **Financial model.** Unit economics with real numbers, GMV projections, take-rate scenarios, runway analysis.
- **Supplier negotiation positions.** Target take rates per supplier, opening offers, walk-aways, contract drafts.
- **Signed contracts.** Supplier agreements, employment agreements, advisor agreements, vendor MSAs.
- **Cap table and equity.** Founder split, advisor grants, ESOP design.
- **Compensation and HR.** Salary bands, individual compensation, performance reviews.
- **Strategic competitive analysis.** Specific data on competitors that came from non-public sources or that reveals our positioning thinking.
- **Personal data of any kind.** Names of dentists, named clinic relationships, anything tying a person to a transaction. Personal data primarily lives in the production database, not in any document, but if it must be referenced operationally (a specific incident, a specific account), it goes in the private repo with access controls and a retention deadline.
- **Incident post-mortems involving named individuals.** Sanitized versions can move to the public repo's `security/` folder after the incident is closed and personal references are stripped.

## When we are unsure

Default to private. It is much cheaper to move a document to public later (after review) than to undo a public leak.

If a document is half-public-safe and half-confidential, split it into two documents.

## Creating the private repo

Pablo is the appropriate creator for the private repo. The public repo's owner cannot grant private-repo access to a colleague without Pablo's explicit action. The recommended setup, when ready:

1. Create `pabloatria/dental-prices-internal` as a private GitHub repo.
2. Mirror the same folder structure as `/docs/` here (`strategy/`, `product/`, `architecture/`, `operations/`, `privacy/`, `finance/`, `legal/`, `hr/`).
3. Add a `README.md` that points back to this public repo's `docs/README.md` and explains the split.
4. Add only Pablo and explicit collaborators by GitHub username. No "anyone with the link" sharing.
5. Configure branch protection: require PR review for changes to legal documents and the financial model.
6. Set up a 2FA-required policy for any collaborator.

## Cross-references

When a public document needs to point to a confidential one (e.g., the supplier onboarding playbook references a contract template), the public document references it by name and folder path within the private repo, but does not include the content. Example: "the supplier-agreement template in `legal-private/templates/supplier-agreement.md` (private repo)".

## Ongoing discipline

Every document in this public repo is audited at least once per year by Pablo to catch material that should have moved to private. The audit is logged in `security/annual-doc-audit-YYYY.md`.
