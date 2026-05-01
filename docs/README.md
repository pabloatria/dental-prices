# DentalPrecios — Documentation Index

This folder is the canonical source of truth for the technical architecture, product strategy, and operational playbooks of DentalPrecios.

## Repository structure (public vs private)

This GitHub repository is **public**. Documents in `/docs/` are written with that visibility in mind. Material that should not be public — fundraising plans, named investor lists, supplier-negotiation positions, take-rate targets, internal financial models, anything containing personal data of dentists or staff — lives in a separate private repository (`pabloatria/dental-prices-internal`, to be created when needed).

If you are about to write a document and you are unsure which side it belongs on, the rule is: **default to private**. It is much cheaper to move a private doc public later than to undo a public leak.

## Folder map

| Folder | What lives here |
|---|---|
| `strategy/` | Vision, roadmap, market thesis, competitive analysis. Public-safe. |
| `product/` | Product specs for shippable tracks (MCP server, marketplace, agent checkout). |
| `architecture/` | System design, data model, API and integration designs. |
| `operations/` | Supplier onboarding playbooks, order-fulfillment runbooks, customer support procedures. |
| `privacy/` | Data classification, PII handling rules, Chilean regulatory framework. Public — transparency is a feature of trust. |
| `plans/` | Pre-existing implementation plans (legacy; new plans go under `product/`). |
| `security/` | Security incident records, hardening notes. |

## Navigating this folder

For a new contributor or contractor, read in this order:

1. `strategy/00-vision.md` — what we are building and why.
2. `strategy/01-roadmap.md` — phasing across the three tracks.
3. `product/track-1-mcp-server.md` — the concrete first ship.
4. `privacy/00-privacy-principles.md` — the data discipline non-negotiable.
5. `architecture/00-system-overview.md` — current state and target state of the platform.

## Document conventions

- Markdown. No emojis in document bodies.
- Numbered prefix (`00-`, `01-`) where reading order matters.
- Each document has a short header noting status: `Draft` / `Active` / `Superseded`.
- Forward-looking documents (specs for things not yet built) state at the top: "Status: planned, target ship date X."
- Date the document with the date of last meaningful edit, not creation.

## Update protocol

When you change something material, update the document. When you change something operational, also update the corresponding runbook in `operations/`. Stale documentation is worse than no documentation because it actively misleads.
