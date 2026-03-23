# DentalPrecios Marketplace — Architecture Design

**Status:** Approved design, not yet implemented
**Date:** 2026-03-23
**Decisions:** Full marketplace, Mercado Pago, 8% commission, suppliers ship, one payment split

---

## 1. Database Schema

### 1.1 supplier_profiles
Marketplace-specific supplier data linked to existing `suppliers` table.

```sql
CREATE TABLE supplier_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) UNIQUE,
  contact_email text NOT NULL,
  contact_phone text,
  business_name text NOT NULL,
  rut text NOT NULL,
  business_address text NOT NULL,
  comuna text,
  region text,
  marketplace_active boolean DEFAULT false,
  commission_rate numeric(5,4) DEFAULT 0.08,
  mp_access_token_encrypted text,
  mp_refresh_token_encrypted text,
  mp_user_id text,
  mp_connected_at timestamptz,
  ships_nationwide boolean DEFAULT false,
  shipping_regions text[],
  default_shipping_cost integer DEFAULT 0,
  estimated_shipping_days integer DEFAULT 3,
  description text,
  logo_url text,
  return_policy text,
  onboarding_status text DEFAULT 'pending'
    CHECK (onboarding_status IN ('pending','documents_submitted','approved','rejected','suspended')),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 1.2 marketplace_products
Supplier-listed products for direct sale.

```sql
CREATE TABLE marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  product_id uuid REFERENCES products(id),
  title text NOT NULL,
  description text,
  sku text,
  price integer NOT NULL,
  compare_at_price integer,
  stock_quantity integer DEFAULT 0,
  status text DEFAULT 'draft'
    CHECK (status IN ('draft','pending_review','active','paused','rejected')),
  weight_grams integer,
  shipping_cost_override integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, sku)
);
```

### 1.3 carts & cart_items

```sql
CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  marketplace_product_id uuid NOT NULL REFERENCES marketplace_products(id),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_snapshot integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cart_id, marketplace_product_id)
);
```

### 1.4 orders & order_items

```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  buyer_email text NOT NULL,
  buyer_name text NOT NULL,
  buyer_phone text,
  shipping_address text NOT NULL,
  shipping_comuna text NOT NULL,
  shipping_region text NOT NULL,
  shipping_notes text,
  subtotal integer NOT NULL,
  total_shipping integer NOT NULL,
  total_amount integer NOT NULL,
  total_commission integer NOT NULL,
  payment_status text DEFAULT 'pending'
    CHECK (payment_status IN ('pending','processing','paid','failed','refunded')),
  mp_preference_id text,
  mp_payment_id text,
  paid_at timestamptz,
  status text DEFAULT 'created'
    CHECK (status IN ('created','paid','partially_shipped','shipped','delivered','cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  marketplace_product_id uuid NOT NULL REFERENCES marketplace_products(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  product_title text NOT NULL,
  unit_price integer NOT NULL,
  quantity integer NOT NULL,
  line_total integer NOT NULL,
  shipping_cost integer NOT NULL DEFAULT 0,
  commission_amount integer NOT NULL,
  fulfillment_status text DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending','confirmed','preparing','shipped','delivered','cancelled')),
  tracking_number text,
  tracking_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  payout_id uuid REFERENCES payouts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 1.5 payouts

```sql
CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  gross_amount integer NOT NULL,
  commission_amount integer NOT NULL,
  net_amount integer NOT NULL,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),
  mp_transfer_id text,
  paid_at timestamptz,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 1.6 shipping_addresses

```sql
CREATE TABLE shipping_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  label text DEFAULT 'Principal',
  full_name text NOT NULL,
  address text NOT NULL,
  comuna text NOT NULL,
  region text NOT NULL,
  phone text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

---

## 2. Mercado Pago Integration

### Checkout Flow
1. Buyer clicks "Pagar" → POST `/api/checkout/create-preference`
2. Server validates cart, creates order, calls MP API to create preference
3. Frontend redirects to Mercado Pago checkout (init_point URL)
4. Buyer pays → MP redirects back to `/checkout/resultado?status=approved`
5. Webhook POST `/api/webhooks/mercadopago` confirms payment
6. Update order status, notify suppliers, decrement stock, clear cart

### Split Payments
Per supplier in order:
- `supplier_subtotal` = sum of their items
- `marketplace_fee` = subtotal × 0.08
- Remaining 92% goes to supplier's MP account via `collector_id`

### Supplier OAuth
1. Supplier clicks "Conectar Mercado Pago" → redirect to MP auth
2. MP callback with code → exchange for access_token
3. Store encrypted tokens in `supplier_profiles`

---

## 3. Route Structure

### Buyer Pages
- `/checkout` — Checkout page
- `/checkout/resultado` — Post-payment result
- `/mis-pedidos` — Order history
- `/mis-pedidos/[id]` — Order detail

### Supplier Dashboard (`/proveedor/`)
- `/proveedor` — Overview (metrics, recent orders)
- `/proveedor/registro` — Registration form
- `/proveedor/pedidos` — Order management
- `/proveedor/productos` — Product CRUD
- `/proveedor/pagos` — Payout history
- `/proveedor/configuracion` — Settings + MP connect

### Admin Dashboard (`/admin/`)
- `/admin` — Overview (revenue, commissions)
- `/admin/pedidos` — All orders
- `/admin/proveedores` — Supplier management (approve/reject)
- `/admin/productos` — Product moderation
- `/admin/pagos` — Payout management

### API Routes
| Route | Purpose |
|-------|---------|
| `/api/cart` | GET cart |
| `/api/cart/items` | POST/PATCH/DELETE cart items |
| `/api/checkout/create-preference` | Create MP preference |
| `/api/webhooks/mercadopago` | MP webhook handler |
| `/api/supplier/register` | Create supplier profile |
| `/api/supplier/products` | Supplier product CRUD |
| `/api/supplier/orders` | Supplier order items |
| `/api/supplier/mercadopago/connect` | Start MP OAuth |
| `/api/supplier/mercadopago/callback` | Handle MP OAuth |
| `/api/admin/suppliers/[id]/approve` | Approve supplier |
| `/api/admin/products/[id]/approve` | Approve product |
| `/api/admin/payouts` | Manage payouts |

---

## 4. Product Page Integration

On `/producto/[id]`, the `EnhancedPriceTable` currently shows "Ir a comprar" links. For marketplace-enabled suppliers:
- Query `marketplace_products` where `product_id = current` AND `status = 'active'`
- Show "Agregar al carrito" instead of "Ir a comprar" for those suppliers
- Gradual transition — suppliers can be on marketplace for some products only

---

## 5. Environment Variables

```
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_CLIENT_ID=
MERCADOPAGO_CLIENT_SECRET=
MERCADOPAGO_WEBHOOK_SECRET=
ADMIN_EMAILS=pablo@dentalprecios.cl
ENCRYPTION_KEY=
```

---

## 6. Implementation Phases

**Phase 1 — Foundation (Week 1-2)**
SQL migrations, MP utility, types, admin auth

**Phase 2 — Supplier Onboarding (Week 2-3)**
Registration, dashboard, MP OAuth, product CRUD, admin approval

**Phase 3 — Cart & Checkout (Week 3-4)**
Cart API, CartDrawer, AddToCartButton, checkout page, MP preference, webhook

**Phase 4 — Order Management (Week 4-5)**
Buyer order history, supplier fulfillment, email notifications, admin orders

**Phase 5 — Payouts & Polish (Week 5-6)**
Payout calculation, admin payout management, commission reporting, product page integration
