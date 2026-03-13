# Subscription System & Back-in-Stock Alerts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a subscription system (free + coming-soon premium tiers) with back-in-stock email alerts gated behind subscription.

**Architecture:** New `subscribers`, `stock_alerts`, and `restock_events` tables in Supabase. Scrapers detect stock transitions and INSERT into `restock_events`. A Vercel Cron job (hourly, 9AM-8PM Chile) reads unprocessed events, groups notifications per user, sends one email via Resend, then marks events processed and alerts deactivated (one-shot). Free tier allows 2 stock alerts (email only). Premium tier (coming soon, disabled) adds unlimited alerts + WhatsApp.

**Tech Stack:** Next.js 16 (App Router), Supabase (PostgreSQL + Auth), Resend (email), Vercel Cron, Tailwind CSS, Python scrapers

**Design doc:** `docs/plans/2026-03-13-subscription-stock-alerts-design.md`

---

### Task 1: Database Migration — Create Tables

**Files:**
- Create: `web/supabase/migrations/001_subscription_stock_alerts.sql`

**Step 1: Write the migration SQL**

```sql
-- Subscribers table
CREATE TABLE subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  whatsapp_number TEXT
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

-- Stock alerts table
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
CREATE POLICY "Service role full access on stock_alerts"
  ON stock_alerts USING (auth.role() = 'service_role');

-- Restock events table (scrapers write, cron reads)
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

**Step 2: Run the migration in Supabase SQL editor**

Copy and paste the SQL above into the Supabase dashboard SQL editor and execute. Verify all three tables appear in the Table Editor.

**Step 3: Commit**

```bash
git add web/supabase/migrations/001_subscription_stock_alerts.sql
git commit -m "feat: add subscribers, stock_alerts, restock_events tables"
```

---

### Task 2: Install Resend + Vercel Cron Config

**Files:**
- Modify: `web/package.json` (add resend dependency)
- Create: `web/vercel.json` (cron schedule)

**Step 1: Install resend**

```bash
cd web && npm install resend
```

**Step 2: Create vercel.json with cron config**

```json
{
  "crons": [
    {
      "path": "/api/cron/send-restock-notifications",
      "schedule": "0 12-23 * * *"
    }
  ]
}
```

Note: `0 12-23 * * *` = every hour from 12:00-23:00 UTC = 9AM-8PM Chile time (UTC-3).

**Step 3: Commit**

```bash
git add web/package.json web/package-lock.json web/vercel.json
git commit -m "feat: add resend dependency and vercel cron config"
```

---

### Task 3: Subscription API Route

**Files:**
- Create: `web/src/app/api/subscription/route.ts`

**Step 1: Create the subscription CRUD route**

Follow the exact pattern from `web/src/app/api/favorites/route.ts` (GET/POST/DELETE with auth check).

```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await supabase
    .from('subscribers')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  return Response.json({ subscription: data })
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  // Check if already subscribed
  const { data: existing } = await supabase
    .from('subscribers')
    .select('id')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (existing) return Response.json({ success: true, already: true })

  const { error } = await supabase
    .from('subscribers')
    .insert({ user_id: user.id, plan: 'free' })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  await supabase
    .from('subscribers')
    .update({ active: false })
    .eq('user_id', user.id)

  return Response.json({ success: true })
}
```

**Step 2: Build to verify no errors**

```bash
cd web && npm run build
```

**Step 3: Commit**

```bash
git add web/src/app/api/subscription/route.ts
git commit -m "feat: add subscription API route (GET/POST/DELETE)"
```

---

### Task 4: Stock Alerts API Route

**Files:**
- Create: `web/src/app/api/stock-alerts/route.ts`

**Step 1: Create the stock alerts CRUD route**

Follow the pattern from `web/src/app/api/alerts/route.ts` but add: subscriber check on POST, 2-alert limit enforcement.

```typescript
import { createClient } from '@/lib/supabase/server'

const FREE_ALERT_LIMIT = 2

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await supabase
    .from('stock_alerts')
    .select('*, product:products(*), supplier:suppliers(id, name)')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  return Response.json({ alerts: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  // Check subscriber status
  const { data: sub } = await supabase
    .from('subscribers')
    .select('id, plan')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (!sub) {
    return Response.json({ error: 'Debes suscribirte para crear alertas de stock' }, { status: 403 })
  }

  // Enforce free tier limit
  if (sub.plan === 'free') {
    const { count } = await supabase
      .from('stock_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('active', true)

    if ((count ?? 0) >= FREE_ALERT_LIMIT) {
      return Response.json({
        error: `Límite de ${FREE_ALERT_LIMIT} alertas alcanzado. Actualiza a Premium para más.`,
        limit_reached: true,
      }, { status: 403 })
    }
  }

  const { product_id, supplier_id } = await request.json()
  const { error } = await supabase
    .from('stock_alerts')
    .insert({ user_id: user.id, product_id, supplier_id })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { product_id, supplier_id } = await request.json()
  await supabase
    .from('stock_alerts')
    .update({ active: false })
    .eq('user_id', user.id)
    .eq('product_id', product_id)
    .eq('supplier_id', supplier_id)

  return Response.json({ success: true })
}
```

**Step 2: Build to verify**

```bash
cd web && npm run build
```

**Step 3: Commit**

```bash
git add web/src/app/api/stock-alerts/route.ts
git commit -m "feat: add stock alerts API with subscriber check and free tier limit"
```

---

### Task 5: Subscription Page (`/suscripcion`)

**Files:**
- Create: `web/src/app/suscripcion/page.tsx`

**Step 1: Create the pricing page**

This is a server component that checks auth and subscription status, renders two tier cards side by side.

```tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SubscribeButton from '@/components/subscription/SubscribeButton'

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let subscription = null
  if (user) {
    const { data } = await supabase
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle()
    subscription = data
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Suscripción</span>
      </nav>

      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-foreground mb-2">Planes de suscripción</h1>
        <p className="text-muted-foreground">Recibe alertas cuando tus productos favoritos vuelvan a estar disponibles</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Free Tier */}
        <div className={`bg-card rounded-xl border-2 p-6 ${subscription ? 'border-primary' : 'border-border'}`}>
          {subscription && (
            <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-3">
              Tu plan actual
            </span>
          )}
          <h2 className="text-xl font-bold text-foreground">Plan Gratis</h2>
          <p className="text-3xl font-bold text-foreground mt-2">$0<span className="text-sm font-normal text-muted-foreground">/mes</span></p>

          <ul className="mt-6 space-y-3">
            {[
              'Favoritos ilimitados',
              'Alertas de precio ilimitadas',
              '2 alertas de stock',
              'Notificaciones por email',
              'Historial de precios 30 días',
              'Comparador de precios',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <SubscribeButton isLoggedIn={!!user} isSubscribed={!!subscription} />
          </div>
        </div>

        {/* Premium Tier (Coming Soon) */}
        <div className="bg-card rounded-xl border-2 border-border p-6 relative opacity-75">
          <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full mb-3">
            Próximamente
          </span>
          <h2 className="text-xl font-bold text-foreground">Plan Premium</h2>
          <p className="text-3xl font-bold text-foreground mt-2">$3.990<span className="text-sm font-normal text-muted-foreground">/mes</span></p>

          <p className="text-sm text-muted-foreground mt-4 mb-2">Todo lo del plan gratis, más:</p>
          <ul className="space-y-3">
            {[
              'Alertas de stock ilimitadas',
              'Notificaciones por WhatsApp',
              'Alertas de precio por email',
              'Notificaciones prioritarias',
              'Sin publicidad',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <button
              disabled
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-muted text-muted-foreground cursor-not-allowed"
            >
              Próximamente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Create the SubscribeButton client component**

Create `web/src/components/subscription/SubscribeButton.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SubscribeButton({
  isLoggedIn,
  isSubscribed,
}: {
  isLoggedIn: boolean
  isSubscribed: boolean
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (isSubscribed) {
    return (
      <button
        disabled
        className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/20 cursor-default"
      >
        Suscripción activa
      </button>
    )
  }

  const handleSubscribe = async () => {
    if (!isLoggedIn) {
      window.location.href = '/ingresar'
      return
    }

    setLoading(true)
    await fetch('/api/subscription', { method: 'POST' })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
    >
      {loading ? 'Suscribiendo...' : 'Suscribirse gratis'}
    </button>
  )
}
```

**Step 3: Build to verify**

```bash
cd web && npm run build
```

**Step 4: Commit**

```bash
git add web/src/app/suscripcion/page.tsx web/src/components/subscription/SubscribeButton.tsx
git commit -m "feat: add subscription page with free and premium tier cards"
```

---

### Task 6: StockAlertButton Component

**Files:**
- Create: `web/src/components/product/StockAlertButton.tsx`

**Step 1: Create the client component**

Follow the pattern from `web/src/components/product/PriceAlertButton.tsx` (lines 1-148): useEffect for auth check, toggle via Supabase client, redirect to `/ingresar` if not logged in.

```tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function StockAlertButton({
  productId,
  supplierId,
  supplierName,
}: {
  productId: string
  supplierId: string
  supplierName: string
}) {
  const [hasAlert, setHasAlert] = useState(false)
  const [isSubscriber, setIsSubscriber] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      // Check subscription
      const { data: sub } = await supabase
        .from('subscribers')
        .select('id, plan')
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle()

      if (sub) setIsSubscriber(true)

      // Check existing alert
      const { data: alert } = await supabase
        .from('stock_alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('supplier_id', supplierId)
        .eq('active', true)
        .maybeSingle()

      if (alert) setHasAlert(true)

      // Check limit (free tier = 2)
      if (sub?.plan === 'free' && !alert) {
        const { count } = await supabase
          .from('stock_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('active', true)

        if ((count ?? 0) >= 2) setLimitReached(true)
      }
    }
    check()
  }, [productId, supplierId])

  const createAlert = async () => {
    if (!userId) {
      window.location.href = '/ingresar'
      return
    }
    if (!isSubscriber) {
      window.location.href = '/suscripcion'
      return
    }

    setLoading(true)
    const res = await fetch('/api/stock-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, supplier_id: supplierId }),
    })

    const data = await res.json()
    if (data.limit_reached) {
      setLimitReached(true)
    } else if (data.success) {
      setHasAlert(true)
    }
    setLoading(false)
  }

  const removeAlert = async () => {
    setLoading(true)
    await fetch('/api/stock-alerts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, supplier_id: supplierId }),
    })
    setHasAlert(false)
    setLimitReached(false)
    setLoading(false)
  }

  if (hasAlert) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/5 border border-primary/20 rounded text-xs text-primary">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          Te avisaremos
        </span>
        <button
          onClick={removeAlert}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Eliminar
        </button>
      </div>
    )
  }

  if (limitReached) {
    return (
      <span className="text-xs text-muted-foreground" title="Actualiza a Premium para más alertas">
        Límite alcanzado
      </span>
    )
  }

  return (
    <button
      onClick={createAlert}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
      {isSubscriber ? 'Avisarme' : 'Suscríbete'}
    </button>
  )
}
```

**Step 2: Build to verify**

```bash
cd web && npm run build
```

**Step 3: Commit**

```bash
git add web/src/components/product/StockAlertButton.tsx
git commit -m "feat: add StockAlertButton with subscription gating and free limit"
```

---

### Task 7: Integrate StockAlertButton into EnhancedPriceTable

**Files:**
- Modify: `web/src/components/product/EnhancedPriceTable.tsx:1-122`
- Modify: `web/src/app/producto/[id]/page.tsx:209`

**Step 1: Update EnhancedPriceTable to accept productId and render StockAlertButton**

At `web/src/components/product/EnhancedPriceTable.tsx`:

- Line 1: Add import for StockAlertButton
- Line 5: Add `productId` prop
- Lines 91-92: Replace the "Agotado" span with a div containing both the span and StockAlertButton

Changes:

```diff
// Line 1-3: Add import
+import StockAlertButton from '@/components/product/StockAlertButton'
 import type { Price } from '@/lib/types'
 import { formatCLP } from '@/lib/queries/products'

// Line 5: Add productId prop
-export default function EnhancedPriceTable({ prices }: { prices: Price[] }) {
+export default function EnhancedPriceTable({ prices, productId }: { prices: Price[], productId: string }) {

// Lines 91-92: Replace "Agotado" span
-                    <span className="text-sm text-muted-foreground">Agotado</span>
+                    <div className="flex flex-col items-center gap-1">
+                      <span className="text-sm text-muted-foreground">Agotado</span>
+                      <StockAlertButton
+                        productId={productId}
+                        supplierId={price.supplier_id}
+                        supplierName={price.supplier.name}
+                      />
+                    </div>
```

**Step 2: Pass productId from product detail page**

At `web/src/app/producto/[id]/page.tsx` line 209:

```diff
-        <EnhancedPriceTable prices={currentPrices} />
+        <EnhancedPriceTable prices={currentPrices} productId={product.id} />
```

**Step 3: Build to verify**

```bash
cd web && npm run build
```

**Step 4: Commit**

```bash
git add web/src/components/product/EnhancedPriceTable.tsx web/src/app/producto/\\[id\\]/page.tsx
git commit -m "feat: integrate StockAlertButton into price table for out-of-stock rows"
```

---

### Task 8: Update mi-cuenta Page

**Files:**
- Modify: `web/src/app/mi-cuenta/page.tsx:1-93`

**Step 1: Add subscription status card and stock alerts section**

Add two new queries after the existing `alerts` query (after line 21):

```typescript
  const { data: subscription } = await supabase
    .from('subscribers')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  const { data: stockAlerts } = await supabase
    .from('stock_alerts')
    .select('*, product:products(*), supplier:suppliers(id, name)')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })
```

After the header div (after line 35), add a subscription status card:

```tsx
      {/* Subscription status */}
      <div className="bg-card rounded-xl border border-border p-4 mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {subscription ? 'Plan Gratis activo' : 'Sin suscripción'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subscription ? '2 alertas de stock incluidas' : 'Suscríbete para recibir alertas de stock'}
          </p>
        </div>
        <Link
          href="/suscripcion"
          className="text-sm text-primary hover:underline"
        >
          {subscription ? 'Ver planes' : 'Suscribirse'}
        </Link>
      </div>
```

After the price alerts section (after line 90, before the closing `</div>`), add stock alerts:

```tsx
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">Mis alertas de stock</h2>
        {stockAlerts && stockAlerts.length > 0 ? (
          <div className="space-y-3">
            {stockAlerts.map((alert: any) => (
              <div key={alert.id} className="bg-card p-4 rounded-xl border border-border">
                <Link href={`/producto/${alert.product.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                  {alert.product.name}
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  Esperando stock en {alert.supplier.name}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <svg className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <p className="text-muted-foreground">No tienes alertas de stock activas</p>
          </div>
        )}
      </section>
```

**Step 2: Build to verify**

```bash
cd web && npm run build
```

**Step 3: Commit**

```bash
git add web/src/app/mi-cuenta/page.tsx
git commit -m "feat: add subscription card and stock alerts section to mi-cuenta"
```

---

### Task 9: Add Navigation Links

**Files:**
- Modify: `web/src/components/layout/Header.tsx:35-44`
- Modify: `web/src/components/layout/MobileNav.tsx:63-74`
- Modify: `web/src/components/layout/Footer.tsx:42-59`

**Step 1: Add "Suscripción" link to Header**

At `web/src/components/layout/Header.tsx`, inside the `<nav>` element (line 35), before the "Mi cuenta" link, add:

```tsx
          <Link
            href="/suscripcion"
            className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-accent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <span>Alertas</span>
          </Link>
```

**Step 2: Add link to MobileNav**

At `web/src/components/layout/MobileNav.tsx`, after the divider (line 63), before the "Mi cuenta" link, add:

```tsx
            <Link
              href="/suscripcion"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              Alertas de stock
            </Link>
```

**Step 3: Add link to Footer**

At `web/src/components/layout/Footer.tsx`, in the navigation links list (after the "Mi cuenta" li around line 58), add:

```tsx
              <li>
                <Link href="/suscripcion" className="text-sm text-background/60 hover:text-background transition-colors">
                  Suscripción
                </Link>
              </li>
```

**Step 4: Build to verify**

```bash
cd web && npm run build
```

**Step 5: Commit**

```bash
git add web/src/components/layout/Header.tsx web/src/components/layout/MobileNav.tsx web/src/components/layout/Footer.tsx
git commit -m "feat: add subscription navigation links to header, mobile nav, and footer"
```

---

### Task 10: Scraper — Detect Restocks and Insert Events

**Files:**
- Modify: `scrapers/main.py:503-514`

**Step 1: Add restock detection function**

At the top of `main.py` (after existing imports), add:

```python
import requests as http_requests  # only needed if we later add webhook; for now just DB inserts
```

Before the `main()` function, add the restock detection helper:

```python
def check_and_record_restock(supabase, product_id, supplier_id, new_in_stock):
    """If product went from out-of-stock to in-stock, record a restock event."""
    if not new_in_stock:
        return  # Only care about items coming back in stock

    # Get the most recent previous price for this product+supplier
    result = supabase.table("prices") \
        .select("in_stock") \
        .eq("product_id", product_id) \
        .eq("supplier_id", supplier_id) \
        .order("scraped_at", desc=True) \
        .limit(1) \
        .execute()

    if not result.data:
        return  # First time seeing this product at this supplier — not a restock

    prev_in_stock = result.data[0]["in_stock"]
    if prev_in_stock:
        return  # Was already in stock — no change

    # Restock detected! Record the event
    logger.info(f"RESTOCK DETECTED: product={product_id} supplier={supplier_id}")
    try:
        supabase.table("restock_events").insert({
            "product_id": product_id,
            "supplier_id": supplier_id,
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to record restock event: {e}")
```

**Step 2: Call it before each price insert**

At `main.py` line 503, before the `supabase.table("prices").insert(...)` call, add:

```python
                # Check for restock event before inserting new price
                check_and_record_restock(
                    supabase, product_id, supplier_id,
                    product.get("in_stock", True),
                )
```

The resulting code around line 503 should look like:

```python
                # Check for restock event before inserting new price
                check_and_record_restock(
                    supabase, product_id, supplier_id,
                    product.get("in_stock", True),
                )

                # Insert price record
                try:
                    supabase.table("prices").insert({
                        "product_id": product_id,
                        "supplier_id": supplier_id,
                        "price": product["price"],
                        "product_url": product.get("product_url", ""),
                        "in_stock": product.get("in_stock", True),
                    }).execute()
                    total_prices += 1
```

**Step 3: Test by running a single scraper**

```bash
cd scrapers && python3 -c "
from main import check_and_record_restock
print('Function loaded successfully')
"
```

Expected: `Function loaded successfully` (no import errors)

**Step 4: Commit**

```bash
git add scrapers/main.py
git commit -m "feat: detect restocks in scraper and record to restock_events table"
```

---

### Task 11: Vercel Cron — Send Restock Notifications

**Files:**
- Create: `web/src/app/api/cron/send-restock-notifications/route.ts`

**Step 1: Create the cron endpoint**

This endpoint is called by Vercel Cron every hour (9AM-8PM Chile). It uses the service role Supabase client to bypass RLS.

```typescript
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Get unprocessed restock events
  const { data: events } = await supabase
    .from('restock_events')
    .select('id, product_id, supplier_id')
    .eq('processed', false)
    .order('detected_at', { ascending: true })

  if (!events || events.length === 0) {
    return Response.json({ message: 'No restock events', sent: 0 })
  }

  // 2. For each event, find matching active stock alerts
  const notifications = new Map<string, {
    email: string
    products: { name: string; supplier: string; url: string }[]
    alertIds: string[]
  }>()

  for (const event of events) {
    const { data: alerts } = await supabase
      .from('stock_alerts')
      .select('id, user_id')
      .eq('product_id', event.product_id)
      .eq('supplier_id', event.supplier_id)
      .eq('active', true)

    if (!alerts || alerts.length === 0) continue

    // Get product and supplier info
    const { data: product } = await supabase
      .from('products')
      .select('name, id')
      .eq('id', event.product_id)
      .single()

    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', event.supplier_id)
      .single()

    if (!product || !supplier) continue

    for (const alert of alerts) {
      if (!notifications.has(alert.user_id)) {
        // Get user email
        const { data: { user } } = await supabase.auth.admin.getUserById(alert.user_id)
        if (!user?.email) continue

        notifications.set(alert.user_id, {
          email: user.email,
          products: [],
          alertIds: [],
        })
      }

      const notif = notifications.get(alert.user_id)!
      notif.products.push({
        name: product.name,
        supplier: supplier.name,
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dentalprecios.cl'}/producto/${product.id}`,
      })
      notif.alertIds.push(alert.id)
    }
  }

  // 3. Send one email per user
  let sent = 0
  for (const [userId, notif] of notifications) {
    const subject = notif.products.length === 1
      ? `"${notif.products[0].name}" volvió a estar disponible`
      : `${notif.products.length} productos volvieron a estar disponibles`

    const productListHtml = notif.products.map((p) => `
      <div style="margin-bottom:16px;padding:12px;background:#f9fafb;border-radius:8px;">
        <p style="margin:0 0 4px;font-weight:600;">${p.name}</p>
        <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Disponible en ${p.supplier}</p>
        <a href="${p.url}" style="display:inline-block;padding:8px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">Ver producto</a>
      </div>
    `).join('')

    try {
      await resend.emails.send({
        from: 'DentalPrecios <alertas@dentalprecios.cl>',
        to: notif.email,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#111;">Buenas noticias</h2>
            <p style="color:#374151;">Los siguientes productos volvieron a estar disponibles:</p>
            ${productListHtml}
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="color:#9ca3af;font-size:12px;">
              Recibiste este email porque tienes una suscripción activa en DentalPrecios.
            </p>
          </div>
        `,
      })
      sent++
    } catch (e) {
      console.error(`Failed to send to ${notif.email}:`, e)
    }

    // Deactivate alerts (one-shot)
    await supabase
      .from('stock_alerts')
      .update({ active: false, notified_at: new Date().toISOString() })
      .in('id', notif.alertIds)
  }

  // 4. Mark all events as processed
  const eventIds = events.map((e) => e.id)
  await supabase
    .from('restock_events')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .in('id', eventIds)

  return Response.json({ message: 'OK', events: events.length, sent })
}
```

**Step 2: Build to verify**

```bash
cd web && npm run build
```

**Step 3: Commit**

```bash
git add web/src/app/api/cron/send-restock-notifications/route.ts
git commit -m "feat: add Vercel Cron endpoint for sending restock notification emails"
```

---

### Task 12: Environment Variables + Build Verification

**Step 1: Add env vars to .env.local**

Add to `web/.env.local`:

```
RESEND_API_KEY=re_placeholder_replace_me
SUPABASE_SERVICE_ROLE_KEY=<copy from scrapers/.env or Supabase dashboard>
CRON_SECRET=placeholder_for_local_dev
NEXT_PUBLIC_SITE_URL=https://dentalprecios.cl
```

**Step 2: Full build verification**

```bash
cd web && npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 3: Commit .env.example (NOT .env.local)**

Create `web/.env.example` with the required vars (no values):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
CRON_SECRET=
NEXT_PUBLIC_SITE_URL=
```

```bash
git add web/.env.example
git commit -m "docs: add .env.example with required environment variables"
```

---

### Task 13: Final Build + Push + Deploy

**Step 1: Full build**

```bash
cd web && npm run build
```

**Step 2: Push to GitHub**

```bash
git push origin main
```

**Step 3: Set environment variables in Vercel dashboard**

- `RESEND_API_KEY` — from resend.com
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard
- `NEXT_PUBLIC_SITE_URL` — `https://dentalprecios.cl`
- `CRON_SECRET` — Vercel auto-provides this for cron routes

**Step 4: Deploy**

Vercel auto-deploys on push, or manually:

```bash
cd web && npx vercel --prod
```

**Step 5: Verify in browser**

1. Visit `/suscripcion` — see Free and Premium (coming soon) tier cards
2. Click "Suscribirse gratis" — redirects to `/ingresar` if not logged in
3. Log in, go to `/suscripcion`, click "Suscribirse gratis" — shows "Suscripción activa"
4. Visit any product with out-of-stock items — see "Avisarme" button next to "Agotado"
5. Click "Avisarme" — changes to "Te avisaremos"
6. Visit `/mi-cuenta` — see subscription card and stock alert
7. Create a 3rd alert — should see "Límite alcanzado"

---

## Summary of All Files

| Task | Action | File |
|------|--------|------|
| 1 | CREATE | `web/supabase/migrations/001_subscription_stock_alerts.sql` |
| 2 | MODIFY | `web/package.json` (add resend) |
| 2 | CREATE | `web/vercel.json` |
| 3 | CREATE | `web/src/app/api/subscription/route.ts` |
| 4 | CREATE | `web/src/app/api/stock-alerts/route.ts` |
| 5 | CREATE | `web/src/app/suscripcion/page.tsx` |
| 5 | CREATE | `web/src/components/subscription/SubscribeButton.tsx` |
| 6 | CREATE | `web/src/components/product/StockAlertButton.tsx` |
| 7 | MODIFY | `web/src/components/product/EnhancedPriceTable.tsx` |
| 7 | MODIFY | `web/src/app/producto/[id]/page.tsx` |
| 8 | MODIFY | `web/src/app/mi-cuenta/page.tsx` |
| 9 | MODIFY | `web/src/components/layout/Header.tsx` |
| 9 | MODIFY | `web/src/components/layout/MobileNav.tsx` |
| 9 | MODIFY | `web/src/components/layout/Footer.tsx` |
| 10 | MODIFY | `scrapers/main.py` |
| 11 | CREATE | `web/src/app/api/cron/send-restock-notifications/route.ts` |
| 12 | CREATE | `web/.env.example` |
