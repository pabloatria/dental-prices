# Dental Price Comparator — Design Document

**Date:** 2026-03-10
**Status:** Approved
**Project name:** DentalPrecios (working title)

## Overview

A price comparison platform for dental products in Chile. Dental offices and labs can search for products they need and see prices from all Chilean dental suppliers in one place, updated daily.

## Target Audience

- Dental offices and clinics (dentists, office managers)
- Dental laboratories

## Business Model

- Affiliate/referral links to supplier websites
- Advertising (AdMob in mobile app, banner ads on web)

## Architecture

```
┌──────────────┐    ┌──────────────┐
│  Next.js     │    │  Expo App    │
│  Website     │    │  (iOS/Android)│
│  (Vercel)    │    │  (App Store)  │
└──────┬───────┘    └──────┬───────┘
       │                   │
       └─────────┬─────────┘
                 ▼
       ┌──────────────────┐
       │  Shared API      │
       │  (Next.js API    │
       │   Routes)        │
       └────────┬─────────┘
                ▼
       ┌──────────────────┐
       │  Supabase DB     │
       │  + Auth           │
       └────────┬─────────┘
                ▲
                │ (writes daily)
       ┌──────────────────┐
       │  Python Scrapers │
       │  (GitHub Actions) │
       └──────────────────┘
```

## Tech Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend + Backend | Next.js 14 (App Router) | Free |
| Web Hosting | Vercel (free tier) | $0/month |
| Mobile App | Expo / React Native (iOS + Android) | Free |
| Database + Auth | Supabase (free tier: 500MB, 50k rows) | $0/month |
| Scrapers | Python (Requests, BeautifulSoup, Playwright) | Free |
| Scraper Scheduling | GitHub Actions (cron) | $0/month |
| Styling | Tailwind CSS | Free |
| Search | Supabase full-text search (PostgreSQL) | Free |
| Email (price alerts) | Resend (free tier: 3000 emails/month) | $0/month |
| Push Notifications | Expo Push Notifications | Free |
| Mobile Ads | Google AdMob | Free (earns revenue) |
| Analytics | Plausible or Vercel Analytics | Free tier |
| Domain (.cl) | ~$10-15/year | ~$1/month |
| Apple Developer | $99/year | ~$8/month |
| Google Play Developer | $25 one-time | — |

**Estimated starting cost: ~$10-15/month**

## Pages

1. **Home (`/`)** — Search bar, popular categories, featured deals
2. **Search Results (`/buscar?q=...`)** — Product list with prices across stores, filters (category, price range, supplier), sort options
3. **Product Detail (`/producto/[id]`)** — Price comparison table, price history chart, similar products, affiliate "Ir a comprar" buttons
4. **Categories (`/categorias`)** — Browse by dental category/specialty
5. **Login/Register (`/ingresar`)** — Email + password, Google sign-in via Supabase Auth
6. **User Dashboard (`/mi-cuenta`)** — Favorites, price alerts, search history
7. **About/Contact (`/nosotros`)** — Platform info, contact form

## Database Schema

### products
- `id` (uuid, PK)
- `name` (text) — e.g., "Resina Filtek Z350 XT 3M"
- `brand` (text)
- `category` (text)
- `description` (text, nullable)
- `image_url` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### suppliers
- `id` (uuid, PK)
- `name` (text) — e.g., "Dental Market Chile"
- `website_url` (text)
- `logo_url` (text, nullable)
- `affiliate_base_url` (text, nullable)
- `active` (boolean)

### prices
- `id` (uuid, PK)
- `product_id` (uuid, FK → products)
- `supplier_id` (uuid, FK → suppliers)
- `price` (integer, CLP) — Chilean pesos, no decimals
- `product_url` (text) — direct link on supplier site
- `in_stock` (boolean)
- `scraped_at` (timestamp)
- `created_at` (timestamp)

### categories
- `id` (uuid, PK)
- `name` (text)
- `slug` (text)
- `parent_id` (uuid, nullable, FK → categories) — for subcategories

### users
- `id` (uuid, from Supabase Auth)
- `email` (text)
- `name` (text, nullable)
- `created_at` (timestamp)

### favorites
- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `product_id` (uuid, FK → products)
- `created_at` (timestamp)

### price_alerts
- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `product_id` (uuid, FK → products)
- `target_price` (integer, CLP)
- `active` (boolean)
- `created_at` (timestamp)

## Scraping System

### Structure
```
scrapers/
├── main.py              — orchestrator
├── base_scraper.py      — shared logic (HTTP, retries, logging)
├── matchers.py          — product name matching/normalization
├── suppliers/
│   ├── dentalmarket.py  — one file per supplier
│   ├── maquira.py
│   └── ...
└── requirements.txt
```

### Technology
- Requests + BeautifulSoup for static HTML sites
- Playwright (headless browser) for JavaScript-heavy sites
- GitHub Actions runs daily at ~4 AM Chile time

### Challenges & Solutions
- **Anti-bot:** Rotate user agents, random delays, respect robots.txt
- **Site changes:** Each scraper has test mode to verify HTML selectors still work; logs errors and skips on failure
- **Product matching:** Manual curation of product catalog to start; scrapers map supplier products to catalog entries. Fuzzy matching added over time.
- **Monitoring:** Summary logs after each run; email notification on scraper failure

## Mobile App (Expo)

- Same features as website, calling the shared Next.js API
- Push notifications for price alerts (Expo Push Notifications)
- AdMob banner ads on search results and product detail pages
- Over-the-air updates via Expo for instant bug fixes

## Language

Spanish only (Chilean Spanish).

## User Accounts

Optional. Anyone can search and compare prices. Signed-in users get:
- Saved favorites
- Price drop alerts (email + push notification)
- Search history

## Upgrade Path

- **Supabase Pro ($25/month):** When exceeding 500MB or 50k rows
- **Vercel Pro ($20/month):** When exceeding 100GB bandwidth/month
- **Native app wrapper:** PWA can be wrapped with Capacitor/TWA if needed later

## Key Risks

1. **Supplier sites blocking scrapers** — Mitigated by respectful scraping practices, rotating user agents, and having fallback approaches (e.g., API partnerships)
2. **Product matching accuracy** — Start with manual curation, improve with fuzzy matching over time
3. **Legal concerns with scraping** — Prices are public data; we link back to supplier sites (driving them traffic); affiliate model aligns our interests with theirs
4. **Scaling** — Free tiers are sufficient for launch; clear upgrade path when needed
