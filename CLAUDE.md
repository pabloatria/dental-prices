# DentalPrecios — Project Conventions

Project-specific rules that override or extend `~/.claude/CLAUDE.md`.

---

## What this project is

DentalPrecios is a price-comparison platform for dental supplies in Chile. The site lets dentists compare 22,000+ products across 40+ suppliers, with prices updated daily by a Python scraper fleet. Domain: `dentalprecios.cl`. Primary user: Chilean dentists in private practice. Secondary: dental distributors who want B2B visibility. LATAM expansion (Mexico, Colombia, Peru, Argentina) is planned but not built. **Chile-only until further notice.**

---

## Repo layout

```
App dental prices/
├─ web/              Next.js 16 frontend (Vercel production target)
│  ├─ src/app/       App Router pages + API routes
│  ├─ src/components/
│  ├─ src/lib/       supabase/, queries/, types.ts, utils
│  ├─ content/blog/  MDX blog posts (rendered via /blog/[slug])
│  └─ public/
├─ scrapers/         Python 3.12 supplier scrapers
│  ├─ main.py        Orchestrator (iterates SCRAPERS list)
│  ├─ base_scraper.py  BaseScraper + PlaywrightStealthSession
│  ├─ matchers.py    Product fuzzy matching (pack-size aware)
│  ├─ health_check.py  Supabase freshness query (daily GH Actions)
│  └─ suppliers/     One file per supplier scraper class
├─ migrations/       Supabase SQL (hand-applied via MCP)
├─ docs/security/    Breach response runbooks, rotation guides
└─ .github/workflows/  scrape.yml (daily) + scraper-health.yml
```

---

## Stack

| Layer | What | Notes |
|---|---|---|
| Frontend | Next.js 16.1.6 (Turbopack) + Tailwind | App Router. `web/src/app/` |
| DB + Auth | Supabase (project `vbtxcjasooepbtxtognc`, `sa-east-1`) | Tables: suppliers, products, prices, categories, price_alerts, restock_events, product_specs, product_ratings |
| Hosting | Vercel project `web` (org `atriapablo-6486s-projects`) | rootDirectory = `web`. Auto-deploy on push to `main` |
| Scrapers | Python 3.12 + requests / Playwright+stealth / cloudscraper | 13 suppliers need Playwright (Cloudflare-protected) |
| Analytics | Vercel Analytics + Speed Insights + GA + Ahrefs | All client-side |

---

## Architecture patterns (hard-learned, do not re-break)

### ISR and `cookies()`

**Any server component that reads `cookies()` forces Next.js to render the whole page dynamic, setting `cache-control: private, no-store` and silently bypassing `revalidate = 3600`.**

`@/lib/supabase/server.ts::createClient()` calls `cookies()`. Pages that only read public data MUST use `@/lib/supabase/public.ts::createPublicClient()` instead. It uses the anon key directly without touching cookies, which lets Next mark the route as static/ISR.

Use `createClient()` (session-aware) ONLY on paths that genuinely need the logged-in user:
- `/mi-cuenta`, `/mi-carrito`, `/suscripcion`, `/ingresar`, `/auth/*`
- `/api/alerts`, `/api/favorites`, `/api/stock-alerts`, `/api/subscription`, `/api/ratings`, `/api/auth`

Everywhere else: `createPublicClient()`.

The root `app/layout.tsx` uses `createPublicClient()` to fetch nav categories. **If you change it back to `createClient()` you will nuke ISR across the entire site.** This cost several days of debugging.

### Middleware matcher is a positive list (not negative)

`src/middleware.ts` uses `config.matcher` as a positive list of paths that benefit from middleware (`/api/:path*`, `/mi-cuenta/:path*`, etc.). Previously it was a negative exclusion pattern that ran on every non-static request, which was the #1 Vercel Edge Function cost driver.

**Never revert to a negative matcher.** If you need middleware on a new path, add it explicitly to the list.

### PostgREST 1000-row cap

Supabase's PostgREST caps responses at 1000 rows regardless of `.limit(n)`. For queries that could return more (e.g. aggregating over the 22k products table), use a server-side Postgres function called via `sb.rpc('fn_name')`. Two we already have:

- `get_category_product_counts()`: product count per top-level category
- `get_supplier_freshness()`: MAX(scraped_at) per supplier
- `extract_pack_count(text)`: IMMUTABLE function mirroring the Python matcher

Add new RPCs via the Supabase MCP `apply_migration` tool with a snake_case name.

### Dynamic routes that use `searchParams`

Pages that read `await searchParams` (like `/precios/limas-endodoncia?sistema=waveone`) are inherently request-dynamic in Next 15+. `revalidate = 3600` still helps internal fetch cache but the response itself will show `x-vercel-cache: MISS` with `cache-control: private, no-store` on every request. Accept this. It's fast enough (~1-1.5s TTFB) and the UX value of URL-filterable state is higher than the cache.

### Pack-size product matching

`scrapers/matchers.py::extract_pack_count()` recognizes explicit pack counts in product names (e.g. "2 Jeringas", "x 3 tubos", "pack de 4"). `are_same_product()` hard-blocks merging two products whose pack counts differ. `products.pack_size` column stores the count when detectable, NULL when the name is ambiguous. **Never backfill NULL pack sizes to 1.** That would merge known-multi-pack SKUs with unknown-quantity SKUs.

---

## Common pitfalls with fixes

### Vercel / deployment

- **rootDirectory = `web`** in the Vercel project config. Running `vercel` from `/web` fails with `web/web does not exist`. Run from repo root, or use `vercel link --project web --yes` first.
- **`vercel env add --sensitive`** is the ONLY CLI way to mark a secret sensitive. Verify by running `vercel env pull`: sensitive vars come back as `VAR_NAME=""` (empty quotes); non-sensitive show the actual value.
- **GitHub Actions curl to site APIs** must set a custom User-Agent. The middleware's `BLOCKED_BOTS` list includes `curl/*`, so default curl gets 403'd before hitting the route. Use `-A "DentalPrecios-GHActions/1.0"` or similar.
- **`path-to-regexp` in `next.config.ts` headers** does NOT do full-path alternation. `source: '/:path(mi-cuenta|mi-carrito)'` matches a SINGLE segment matching that pattern, not two different paths. Write separate rules per path.
- **The "dangerous HTML" hook warning** fires on JSON-LD schema injection via `__html`. That's the standard Next.js pattern for server-built trusted JSON. Ignore the warning when the content is `JSON.stringify(serverBuiltObject)`.

### Scrapers

- **Shopify CDN serves `/products.json` with `content-encoding: br`** as of 2026-03-20. Python `requests` can't decode Brotli without the `brotli` package. Fix (in `base_scraper.py`): `"Accept-Encoding": "gzip, deflate"` (no `br`). Do not advertise encodings you can't decode.
- **Cloudflare-protected sites** need Playwright + stealth with a browser-context warmup (cf_clearance cookie). See `PlaywrightStealthSession` in `base_scraper.py`. Warmup tiers: no-CF (3s), basic CF (5-10s auto-redirect), under-attack CF (reload + wait). Share a single `_PW_BROWSER` across all sessions. Playwright's sync API can only be started once per process.
- **GitHub Actions `timeout-minutes` covers the WHOLE job, including the random-delay step.** A 4h random delay + 5h timeout = cancelled at 5h. Keep delay ≤ 60min and timeout ≤ 355min (under 360 GH-hosted runner hard cap).
- **Scrape run marked "cancelled" looks green to monitoring.** The scrape.yml workflow now opens a `scrape-failure` GitHub issue on `failure()` or `cancelled()`. Don't remove that step.
- **Connection test + main scrape** in `main.py` both hit the supplier URL. Silent failures show as `[Supplier] Connection test FAILED - skipping` followed by JSON parse errors. When a supplier goes stale, check both.
- **Scraper batch failures with same timestamp** indicate a shared cause (e.g. the Apr 18 Shopify Brotli event took down 5 scrapers simultaneously). Don't try to fix them one-by-one, look at what they share (same base class, same protocol, same target domain pattern).
- **Always verify a fix is on `main`.** A fix committed on a feature branch and tested locally does not affect scheduled workflows. Check `git merge-base --is-ancestor <sha> main` before declaring done.

### Content / SEO

- **MDX in `web/content/blog/` breaks on `<N` where N is a digit.** MDX parses `<` as JSX tag open. Write "usa menos de 12 meses" not "usa <12 meses". Same issue with date ranges like "<2025".
- **Next.js metadata title inheritance**: root layout sets a `title.template: '%s | DentalPrecios'`. Page titles should NOT include `| Dentalprecios`. It gets duplicated. Exception: `generateMetadata()` overrides, then the template doesn't apply.
- **Redirects in `next.config.ts`** are 301s. Adding a redirect source that previously served 200 OK can cause a brief GSC indexation wobble. Check GSC Coverage tab after shipping redirects.
- **Paginated URLs** (`?page=2`) get `<meta robots=noindex, follow>` + canonical to page 1. Both are correct for pagination. Don't change to `index`.

### Database

- **Supabase `service_role` key must be marked Sensitive in Vercel.** If not, it's stored AES-at-rest but recoverable by any team member (and potentially leaked in incidents like the Apr 2026 Vercel breach). Rotate + mark sensitive on any change.
- **Before running a big `UPDATE`**, do a dry-run with `SELECT COUNT(*) FILTER (WHERE ...)` to see how many rows match. Several migrations here affected >15k rows; one regex typo would corrupt thousands.

---

## Writing style — hard rules

### No em dashes (—) in user-facing content

Pablo flagged Apr 23, 2026: em dashes read as AI-generated. **Avoid in all reader-facing text:**

- Meta titles and descriptions
- H1, H2, H3
- Blog post bodies, titles, captions
- JSON-LD FAQ answers, product descriptions
- Instagram captions, card text, email copy
- Product page editorial, category intros

**Replacements:**
- Parenthetical: comma, parens, or period
- Colon substitute: colon
- List separator: hyphen with spaces, line break, or restructure

**OK in code comments.** Em dashes in `.ts`/`.py` comments don't ship to users.

**En dashes (–) are fine in number ranges**: `$10.000–$80.000`, `2.5x–4.5x`, `340–420 mm`. Typographically correct, not an AI tell.

**Before any publish, run:** `grep -n '—' <file>`. If any hits are in user-facing text, replace. If only in code comments, leave alone.

### Chilean Spanish register

- `tú` form only. Never Argentine voseo: `tenés` → `tienes`, `pensalo` → `piénsalo`, `filtrá` → `filtra`, `decidí` → `decide`, `usás` → `usas`, `analizás` → `analizas`.
- Number format: dot thousands, CLP suffix where monetary context isn't obvious. `$41.700 CLP`, not `$41,700`. Already handled by `formatCLP()` in `web/src/lib/queries/products.ts`.
- Professional register. Clinical, confident, dentist-to-dentist. No populist framing ("lo que tu proveedor no quiere que veas"). No "amigo, en Chile..." tone. Treat the reader as a peer.
- Rhythm: short sentences, concrete nouns. Cut adjective pairs ("completamente distinto", "absolutamente nada") when one word does the work.

### AI-tell phrase blocklist

Avoid: "no es casualidad que...", "en la era de...", "es fundamental comprender que...", "profundizar en", "holístico", "revolucionario", "en constante evolución", "marca la diferencia", "hacer una diferencia real". Rewrite with specific nouns and verbs.

---

## Handy project tools + scripts

### Supabase SQL via MCP

The Supabase MCP server is at project ID `vbtxcjasooepbtxtognc`. Use:
- `execute_sql` for SELECTs and simple UPDATEs
- `apply_migration` for DDL (CREATE TABLE, ALTER TABLE, CREATE FUNCTION) with a snake_case name

### Useful queries

```sql
-- Fresh supplier count (last 48h)
SELECT COUNT(DISTINCT supplier_id) FROM prices WHERE scraped_at > NOW() - INTERVAL '48 hours';

-- Category product counts (uses RPC, avoids 1000-row cap)
SELECT * FROM get_category_product_counts();

-- Per-supplier freshness
SELECT * FROM get_supplier_freshness();

-- Products matching a brand + pack-size
SELECT id, name, pack_size FROM products WHERE name ILIKE '%filtek%' AND pack_size = 2;
```

### Useful bash

```bash
# Trigger a scrape manually
gh workflow run scrape.yml -R pabloatria/dental-prices

# Check latest scrape status
gh run list --workflow=scrape.yml -R pabloatria/dental-prices --limit 3

# Verify ISR cache-hit on a page (hit 3 times, look for HIT + non-zero age)
for i in 1 2 3; do curl -sI https://www.dentalprecios.cl/categorias | grep -i x-vercel-cache; sleep 1; done

# Rotate CRON_SECRET in both Vercel + GitHub (SAME value, no trailing newline)
NEW=$(openssl rand -base64 32 | tr -d '\n')
printf "%s" "$NEW" | vercel env add CRON_SECRET production --sensitive --force
printf "%s" "$NEW" | gh secret set CRON_SECRET -R pabloatria/dental-prices
```

### Scraper test pattern

Always run one supplier locally before committing scraper changes:

```bash
cd scrapers
python3 -c "from suppliers.eksadental import EksaDentalScraper; s=EksaDentalScraper(); print(s.test()); print(len(s.scrape()))"
```

---

## Environment variables reference

All env vars referenced by the web app. Source of truth = Vercel Project Settings, synced to GH Actions where needed.

| Var | Who needs it | Vercel sensitive? | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | No (public by design) | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | No (public, RLS-protected) | |
| `SUPABASE_SERVICE_ROLE_KEY` | server + scrapers | **YES, sensitive required** | Also in GH Actions secrets. Bypasses RLS. |
| `CRON_SECRET` | API routes + scrapers | **YES, sensitive** | Same value must be in Vercel + GH Actions |
| `RESEND_API_KEY` | cron only | **YES, sensitive** | Not set yet; unblocks price alert emails |
| `NEXT_PUBLIC_GA_ID` | browser | No | |
| `NEXT_PUBLIC_SITE_URL` | server | No | Defaults to dentalprecios.cl |

---

## What "done" looks like for a typical task

### Shipping a blog post

1. `web/content/blog/<slug>.mdx` with proper frontmatter (title, description, date, draft:false, author, keywords array)
2. `grep -n '—' <file>` returns empty (or only comments)
3. `npx next build` passes without MDX errors
4. `git commit` with a verb-first subject. Push to main. Vercel auto-deploys.
5. Hit `/blog/<slug>` in a browser. Verify OG image, meta tags, internal links resolve.

### Shipping a price page (e.g. `/precios/limas-endodoncia`)

1. `web/src/app/precios/<slug>/page.tsx` using `createPublicClient()`, `export const revalidate = 3600`
2. JSON-LD: Product + AggregateOffer + ItemList + FAQPage + BreadcrumbList
3. Add to `REVALIDATE_PATHS` in `web/src/app/api/revalidate/route.ts`
4. Add to `web/src/app/sitemap.ts`
5. Build, commit, push

### Fixing a scraper

1. Read logs via `gh run view <id> --log 2>&1 | grep <supplier>`
2. Reproduce locally with `scraper.test()` + one-off script
3. Fix + run `python3 -m unittest scrapers.test_matchers` if matcher logic changed
4. **Verify fix is on `main`**, not a stale feature branch: `git merge-base --is-ancestor <sha> main`
5. Commit + `gh workflow run scrape.yml` to verify in CI
6. Check Supabase for fresh writes from that supplier within the next run

---

*Last updated: 2026-04-24*
