# Subscription System & Back-in-Stock Alerts — Design

## Context

DentalPrecios users want to be notified when out-of-stock products become available again. This feature is gated behind a free subscription to grow the user base, with a "coming soon" premium tier for future monetization (~$3-5 USD/month).

**Goals:**
- Maximize free signups (generous free tier)
- Gate stock alerts behind subscription
- Premium tier as placeholder (not active yet)
- Email notifications for free; WhatsApp reserved for premium
- No spam: one email per user per check, alerts are one-shot

## Architecture Decisions

### 1. Subscription Model

Two tiers: Free and Premium (coming soon).

**Plan Gratis:**
- Unlimited favorites
- Unlimited price alerts (existing)
- 2 stock alerts (email only)
- Price comparison, 30-day history, search with filters

**Plan Premium (~$3,990 CLP/month — coming soon):**
- Everything in free, plus:
- Unlimited stock alerts
- WhatsApp notifications
- Price drop alerts via email (existing price_alerts, but actually triggered)
- Priority notifications
- Ad-free experience

### 2. Notification Flow (Approach A: Scraper flags + Vercel Cron sends)

Scrapers detect stock transitions (out-of-stock → in-stock) and INSERT into a `restock_events` table. A Vercel Cron job runs every hour from 9 AM to 8 PM Chile time, reads unprocessed events, joins with active stock alerts, groups by user, sends one email per user listing all restocked products, then marks events as processed and alerts as notified.

Overnight restocks accumulate and send at 9 AM.

Alerts are one-shot: after notification, `active = false`. User must re-subscribe.

### 3. Email via Resend

Resend free tier: 100 emails/day, 3,000/month. Simple API, domain verification required for `dentalprecios.cl`.

### 4. WhatsApp (future premium perk)

Meta WhatsApp Business API or Twilio. `whatsapp_number` field ready in subscribers table. Not built now.

## Database Schema

### `subscribers` table

```sql
CREATE TABLE subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  whatsapp_number TEXT  -- for future WhatsApp premium perk
);

CREATE UNIQUE INDEX subscribers_user_unique ON subscribers (user_id) WHERE active = true;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscribers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription"
  ON subscribers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription"
  ON subscribers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on subscribers"
  ON subscribers USING (auth.role() = 'service_role');
```

### `stock_alerts` table

```sql
CREATE TABLE stock_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX stock_alerts_unique_active
  ON stock_alerts (user_id, product_id, supplier_id) WHERE active = true;
CREATE INDEX stock_alerts_product_supplier
  ON stock_alerts (product_id, supplier_id) WHERE active = true;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stock alerts"
  ON stock_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stock alerts"
  ON stock_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stock alerts"
  ON stock_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access"
  ON stock_alerts USING (auth.role() = 'service_role');
```

### `restock_events` table

```sql
CREATE TABLE restock_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  detected_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ
);

CREATE INDEX restock_events_unprocessed
  ON restock_events (processed, detected_at) WHERE processed = false;
ALTER TABLE restock_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on restock_events"
  ON restock_events USING (auth.role() = 'service_role');
```

## Notification Flow

```
Scraper runs
  → detects in_stock: false→true for (product_id, supplier_id)
  → INSERT into restock_events (product_id, supplier_id)

Vercel Cron (hourly, 9AM-8PM Chile / 12-23 UTC)
  → SELECT unprocessed restock_events
  → JOIN stock_alerts WHERE active = true ON (product_id, supplier_id)
  → JOIN subscribers WHERE active = true ON (user_id)
  → GROUP BY user_id → one email per user
  → Send via Resend (batch all restocked products into one email)
  → UPDATE restock_events SET processed = true
  → UPDATE stock_alerts SET active = false, notified_at = now()
```

**Timing rules:**
- Cron runs every hour from 9 AM to 8 PM Chile time
- Overnight restocks (8 PM - 9 AM) batch into the 9 AM send
- One email per user per cron run, listing all their restocked products
- Alerts are one-shot (deactivated after notification)

## UI Components

### `/suscripcion` page

Side-by-side tier comparison. Free tier has "Suscribirse" button (inserts into subscribers table). Premium tier has "Próximamente" disabled button.

If not logged in, "Suscribirse" redirects to `/ingresar`.

### `StockAlertButton` component

Inline in EnhancedPriceTable, next to "Agotado" text for out-of-stock rows.

States:
- Not subscribed → "Suscríbete" → links to `/suscripcion`
- Subscribed, under limit (< 2 active) → "Avisarme" → creates alert
- Subscribed, at limit (2 active) → "Límite alcanzado" (disabled)
- Alert active → "Te avisaremos" badge + "Eliminar" link

### `/mi-cuenta` updates

Two new sections:
1. Subscription status card (plan badge, link to /suscripcion)
2. "Mis alertas de stock" (product name + supplier + "Eliminar")

### Navigation

"Suscripción" link in header and footer.

## Email Template

**Subject (singular):** "{product_name}" volvió a estar disponible en {supplier_name}
**Subject (plural):** {count} productos volvieron a estar disponibles

**Body:** Clean HTML listing each product with name, supplier, price (if available), "Ver producto" CTA button.

**Footer:** "Recibiste este email porque tienes una suscripción activa en DentalPrecios."

**From:** alertas@dentalprecios.cl (Resend domain verification required)

## External Services

### Resend (email)
- Free tier: 100 emails/day, 3,000/month
- Requires domain verification (DNS records for dentalprecios.cl)
- npm package: `resend`

### Vercel Cron
- Config in `vercel.json`
- Schedule: `0 12-23 * * *` (9AM-8PM Chile = UTC-3)
- Secured with `CRON_SECRET` (Vercel auto-provides)

### WhatsApp (future, not built now)
- Meta WhatsApp Business API or Twilio
- whatsapp_number field ready in subscribers table
- Template message pre-approval required by Meta

## Environment Variables

**Vercel + .env.local:**
- `RESEND_API_KEY` — from resend.com
- `SUPABASE_SERVICE_ROLE_KEY` — for cron endpoint (bypass RLS)
- `CRON_SECRET` — Vercel auto-provides for cron auth

**No scraper env changes needed** — scrapers INSERT into restock_events via existing Supabase connection.

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| NEW | `web/src/app/suscripcion/page.tsx` | Pricing page (Free vs Premium tiers) |
| NEW | `web/src/app/api/subscription/route.ts` | Subscribe/unsubscribe API |
| NEW | `web/src/app/api/stock-alerts/route.ts` | Stock alerts CRUD (enforces 2-alert limit) |
| NEW | `web/src/app/api/cron/send-restock-notifications/route.ts` | Vercel Cron — sends emails via Resend |
| NEW | `web/src/components/product/StockAlertButton.tsx` | Bell button for out-of-stock rows |
| MODIFY | `web/src/components/product/EnhancedPriceTable.tsx` | Add StockAlertButton + productId prop |
| MODIFY | `web/src/app/producto/[id]/page.tsx` | Pass productId to EnhancedPriceTable |
| MODIFY | `web/src/app/mi-cuenta/page.tsx` | Add subscription card + stock alerts section |
| MODIFY | `web/src/components/Header.tsx` (or layout) | Add "Suscripción" nav link |
| MODIFY | `scrapers/main.py` | Detect restocks → INSERT into restock_events |
| NEW | `web/vercel.json` | Cron schedule config |
| SQL | Supabase migration | subscribers + stock_alerts + restock_events tables |

## Free Tier Limits

| Feature | Free | Premium (coming soon) |
|---------|------|----------------------|
| Favorites | Unlimited | Unlimited |
| Price alerts (stored) | Unlimited | Unlimited |
| Stock alerts | 2 active | Unlimited |
| Email notifications | Yes | Yes |
| WhatsApp notifications | No | Yes |
| Price drop email alerts | No | Yes |
| Priority notifications | No | Yes |
| Ad-free | No | Yes |
