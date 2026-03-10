# DentalPrecios — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dental product price comparison platform (web + mobile) for the Chilean market.

**Architecture:** Next.js web app with API routes on Vercel, Expo React Native mobile app, Supabase for database/auth, Python scrapers on GitHub Actions running daily.

**Tech Stack:** Next.js 14 (App Router), React, Tailwind CSS, Supabase (PostgreSQL + Auth), Expo/React Native, Python (Requests, BeautifulSoup, Playwright), GitHub Actions.

**Design Doc:** `docs/plans/2026-03-10-dental-price-comparator-design.md`

---

## Phase 1: Project Setup & Infrastructure

### Task 1: Initialize Git Repository

**Files:**
- Create: `.gitignore`

**Step 1: Initialize git**

```bash
cd "/Users/pabloatria/Desktop/App dental prices"
git init
```

**Step 2: Create `.gitignore`**

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Next.js
.next/
out/

# Expo
.expo/
dist/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*

# Environment
.env
.env*.local

# Python
__pycache__/
*.py[cod]
venv/
.venv/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

**Step 3: Initial commit**

```bash
git add .gitignore docs/
git commit -m "docs: add design doc and implementation plan"
```

---

### Task 2: Create Supabase Project

**Note:** This is a manual step done in the browser.

**Step 1: Create Supabase account and project**

1. Go to https://supabase.com and sign up
2. Click "New Project"
3. Name: `dental-precios`
4. Database password: (generate a strong one, save it securely)
5. Region: Choose closest to Chile (South America - São Paulo)
6. Click "Create new project"

**Step 2: Get API credentials**

1. Go to Project Settings > API
2. Copy `Project URL` → this is `NEXT_PUBLIC_SUPABASE_URL`
3. Copy `anon public` key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy `service_role` key → this is `SUPABASE_SERVICE_ROLE_KEY` (for scrapers only, never expose to client)

**Step 3: Save credentials locally**

Create a file `.env.local.example` (committed, no real values):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

### Task 3: Set Up Database Tables

**Step 1: Run SQL in Supabase SQL Editor**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  logo_url TEXT,
  affiliate_base_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prices table (one row per product-supplier-scrape)
CREATE TABLE prices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  price INTEGER NOT NULL, -- CLP (Chilean pesos)
  product_url TEXT NOT NULL,
  in_stock BOOLEAN DEFAULT true,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites table
CREATE TABLE favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Price alerts table
CREATE TABLE price_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_price INTEGER NOT NULL, -- CLP
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_prices_product_id ON prices(product_id);
CREATE INDEX idx_prices_supplier_id ON prices(supplier_id);
CREATE INDEX idx_prices_scraped_at ON prices(scraped_at DESC);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('spanish', name));
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
```

**Step 2: Set up Row Level Security**

```sql
-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- Public read access for catalog data
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can view products" ON products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can view suppliers" ON suppliers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can view prices" ON prices FOR SELECT TO anon, authenticated USING (true);

-- Users manage their own favorites
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Users manage their own price alerts
CREATE POLICY "Users can view own alerts" ON price_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create alerts" ON price_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON price_alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON price_alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

**Step 3: Create a helper function for full-text search**

```sql
-- Function to search products by name (Spanish text search)
CREATE OR REPLACE FUNCTION search_products(search_query TEXT)
RETURNS SETOF products AS $$
  SELECT *
  FROM products
  WHERE to_tsvector('spanish', name || ' ' || COALESCE(brand, '')) @@ plainto_tsquery('spanish', search_query)
  ORDER BY ts_rank(to_tsvector('spanish', name || ' ' || COALESCE(brand, '')), plainto_tsquery('spanish', search_query)) DESC;
$$ LANGUAGE sql STABLE;
```

**Step 4: Seed initial categories**

```sql
INSERT INTO categories (name, slug) VALUES
  ('Resinas', 'resinas'),
  ('Instrumental', 'instrumental'),
  ('Endodoncia', 'endodoncia'),
  ('Ortodoncia', 'ortodoncia'),
  ('Cirugia', 'cirugia'),
  ('Periodoncia', 'periodoncia'),
  ('Protesis', 'protesis'),
  ('Implantologia', 'implantologia'),
  ('Radiologia', 'radiologia'),
  ('Prevencion', 'prevencion'),
  ('Blanqueamiento', 'blanqueamiento'),
  ('Cementos', 'cementos'),
  ('Anestesia', 'anestesia'),
  ('Desechables', 'desechables'),
  ('Bioseguridad', 'bioseguridad'),
  ('Equipamiento', 'equipamiento');
```

---

### Task 4: Initialize Next.js Web App

**Files:**
- Create: `web/` directory with full Next.js project

**Step 1: Create Next.js project**

```bash
cd "/Users/pabloatria/Desktop/App dental prices"
npx create-next-app@latest web --yes --app --tailwind --typescript --eslint --src-dir --import-alias "@/*"
```

**Step 2: Install Supabase dependencies**

```bash
cd web
npm install @supabase/supabase-js @supabase/ssr
```

**Step 3: Create `.env.local`**

```bash
cp ../.env.local.example .env.local
# Then fill in your real Supabase credentials
```

**Step 4: Create Supabase client utilities**

Create `web/src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Can be ignored in Server Components
          }
        },
      },
    }
  )
}
```

Create `web/src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 5: Create middleware for auth session refresh**

Create `web/src/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Step 6: Verify it runs**

```bash
npm run dev
```

Expected: App runs at http://localhost:3000

**Step 7: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js web app with Supabase client"
```

---

## Phase 2: Core Web App — Search & Browse

### Task 5: Build the Home Page

**Files:**
- Modify: `web/src/app/layout.tsx`
- Modify: `web/src/app/page.tsx`
- Create: `web/src/components/SearchBar.tsx`
- Create: `web/src/components/CategoryGrid.tsx`

**Step 1: Update root layout with Spanish lang and global styles**

`web/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DentalPrecios — Compara precios de productos dentales en Chile',
  description: 'Encuentra los mejores precios de productos dentales comparando todas las tiendas de Chile en un solo lugar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

**Step 2: Create SearchBar component**

`web/src/components/SearchBar.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/buscar?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar productos dentales..."
          className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-full focus:border-blue-500 focus:outline-none shadow-sm"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition"
        >
          Buscar
        </button>
      </div>
    </form>
  )
}
```

**Step 3: Create CategoryGrid component**

`web/src/components/CategoryGrid.tsx`:

```tsx
import Link from 'next/link'

const categories = [
  { name: 'Resinas', slug: 'resinas', icon: '🦷' },
  { name: 'Instrumental', slug: 'instrumental', icon: '🔧' },
  { name: 'Endodoncia', slug: 'endodoncia', icon: '📌' },
  { name: 'Ortodoncia', slug: 'ortodoncia', icon: '😁' },
  { name: 'Cirugia', slug: 'cirugia', icon: '✂️' },
  { name: 'Anestesia', slug: 'anestesia', icon: '💉' },
  { name: 'Bioseguridad', slug: 'bioseguridad', icon: '🧤' },
  { name: 'Equipamiento', slug: 'equipamiento', icon: '🏥' },
]

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`/categorias/${cat.slug}`}
          className="flex flex-col items-center p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition"
        >
          <span className="text-3xl mb-2">{cat.icon}</span>
          <span className="text-sm font-medium text-gray-700">{cat.name}</span>
        </Link>
      ))}
    </div>
  )
}
```

**Step 4: Build the home page**

`web/src/app/page.tsx`:

```tsx
import SearchBar from '@/components/SearchBar'
import CategoryGrid from '@/components/CategoryGrid'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">DentalPrecios</h1>
          <a href="/ingresar" className="text-sm text-gray-600 hover:text-blue-600">
            Iniciar sesión
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Compara precios de productos dentales en Chile
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Encuentra el mejor precio comparando todas las tiendas dentales del país
        </p>
        <SearchBar />
      </section>

      {/* Categories */}
      <section className="py-12 px-4">
        <h3 className="text-2xl font-semibold text-center text-gray-800 mb-8">
          Categorías populares
        </h3>
        <CategoryGrid />
      </section>
    </main>
  )
}
```

**Step 5: Verify and commit**

```bash
npm run dev
# Check http://localhost:3000 — should show search bar and categories
git add .
git commit -m "feat: build home page with search bar and category grid"
```

---

### Task 6: Build Search Results Page

**Files:**
- Create: `web/src/app/buscar/page.tsx`
- Create: `web/src/app/api/search/route.ts`
- Create: `web/src/components/ProductCard.tsx`
- Create: `web/src/lib/types.ts`

**Step 1: Define TypeScript types**

`web/src/lib/types.ts`:

```typescript
export interface Product {
  id: string
  name: string
  brand: string | null
  category_id: string | null
  description: string | null
  image_url: string | null
}

export interface Supplier {
  id: string
  name: string
  website_url: string
  logo_url: string | null
}

export interface Price {
  id: string
  product_id: string
  supplier_id: string
  price: number
  product_url: string
  in_stock: boolean
  scraped_at: string
  supplier: Supplier
}

export interface ProductWithPrices extends Product {
  prices: Price[]
  lowest_price: number
  store_count: number
}
```

**Step 2: Create search API route**

`web/src/app/api/search/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  const supabase = await createClient()

  let productQuery = supabase
    .from('products')
    .select('*', { count: 'exact' })

  if (query) {
    productQuery = productQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
  }

  if (category) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', category)
      .single()

    if (cat) {
      productQuery = productQuery.eq('category_id', cat.id)
    }
  }

  const { data: products, count, error } = await productQuery
    .range(offset, offset + limit - 1)
    .order('name')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Get latest prices for these products
  const productIds = products?.map(p => p.id) || []

  if (productIds.length === 0) {
    return Response.json({ products: [], total: 0, page, pages: 0 })
  }

  const { data: prices } = await supabase
    .from('prices')
    .select('*, supplier:suppliers(*)')
    .in('product_id', productIds)
    .order('scraped_at', { ascending: false })

  // Group prices by product, keep only latest per supplier
  const latestPrices = new Map<string, Map<string, typeof prices[0]>>()
  for (const price of prices || []) {
    if (!latestPrices.has(price.product_id)) {
      latestPrices.set(price.product_id, new Map())
    }
    const productPrices = latestPrices.get(price.product_id)!
    if (!productPrices.has(price.supplier_id)) {
      productPrices.set(price.supplier_id, price)
    }
  }

  const productsWithPrices = products?.map(product => {
    const productPrices = Array.from(latestPrices.get(product.id)?.values() || [])
    const inStockPrices = productPrices.filter(p => p.in_stock)
    return {
      ...product,
      prices: productPrices,
      lowest_price: inStockPrices.length > 0 ? Math.min(...inStockPrices.map(p => p.price)) : 0,
      store_count: productPrices.length,
    }
  }) || []

  return Response.json({
    products: productsWithPrices,
    total: count || 0,
    page,
    pages: Math.ceil((count || 0) / limit),
  })
}
```

**Step 3: Create ProductCard component**

`web/src/components/ProductCard.tsx`:

```tsx
import Link from 'next/link'
import { ProductWithPrices } from '@/lib/types'

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
}

export default function ProductCard({ product }: { product: ProductWithPrices }) {
  return (
    <Link
      href={`/producto/${product.id}`}
      className="block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition p-4"
    >
      <div className="flex gap-4">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-20 h-20 object-contain rounded" />
        ) : (
          <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-2xl">🦷</div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{product.name}</h3>
          {product.brand && <p className="text-sm text-gray-500">{product.brand}</p>}
          <div className="mt-2 flex items-baseline gap-2">
            {product.lowest_price > 0 ? (
              <>
                <span className="text-lg font-bold text-green-600">
                  {formatCLP(product.lowest_price)}
                </span>
                <span className="text-sm text-gray-400">
                  en {product.store_count} {product.store_count === 1 ? 'tienda' : 'tiendas'}
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-400">Sin precio disponible</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
```

**Step 4: Create search results page**

`web/src/app/buscar/page.tsx`:

```tsx
import SearchBar from '@/components/SearchBar'
import ProductCard from '@/components/ProductCard'
import { ProductWithPrices } from '@/lib/types'

interface SearchResult {
  products: ProductWithPrices[]
  total: number
  page: number
  pages: number
}

async function searchProducts(query: string, page: number): Promise<SearchResult> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}&page=${page}`, {
    cache: 'no-store',
  })
  return res.json()
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''
  const page = parseInt(params.page || '1')
  const result = await searchProducts(query, page)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/" className="text-2xl font-bold text-blue-600">DentalPrecios</a>
          <div className="flex-1">
            <SearchBar />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500 mb-6">
          {result.total} resultado{result.total !== 1 ? 's' : ''} para &quot;{query}&quot;
        </p>

        <div className="space-y-4">
          {result.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {result.products.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-gray-400">No se encontraron productos</p>
            <p className="text-sm text-gray-400 mt-2">Intenta con otro término de búsqueda</p>
          </div>
        )}
      </div>
    </main>
  )
}
```

**Step 5: Verify and commit**

```bash
npm run dev
# Navigate to http://localhost:3000/buscar?q=resina — should show empty results (no data yet)
git add .
git commit -m "feat: build search results page with API route"
```

---

### Task 7: Build Product Detail Page

**Files:**
- Create: `web/src/app/producto/[id]/page.tsx`
- Create: `web/src/components/PriceTable.tsx`
- Create: `web/src/components/PriceChart.tsx`

**Step 1: Create PriceTable component**

`web/src/components/PriceTable.tsx`:

```tsx
import { Price } from '@/lib/types'

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
}

export default function PriceTable({ prices }: { prices: Price[] }) {
  const sorted = [...prices].sort((a, b) => a.price - b.price)

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tienda</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Precio</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Stock</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((price, i) => (
            <tr key={price.id} className={`border-b border-gray-50 ${i === 0 ? 'bg-green-50' : ''}`}>
              <td className="py-3 px-4">
                <span className="font-medium text-gray-900">{price.supplier.name}</span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className={`font-bold ${i === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {formatCLP(price.price)}
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className={`text-sm ${price.in_stock ? 'text-green-600' : 'text-red-500'}`}>
                  {price.in_stock ? 'Disponible' : 'Agotado'}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <a
                  href={price.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Ir a comprar
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 2: Create PriceChart component (price history)**

`web/src/components/PriceChart.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'

interface PricePoint {
  date: string
  price: number
  supplier: string
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
}

export default function PriceChart({ priceHistory }: { priceHistory: PricePoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || priceHistory.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const padding = 40

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    const prices = priceHistory.map(p => p.price)
    const minPrice = Math.min(...prices) * 0.95
    const maxPrice = Math.max(...prices) * 1.05

    const xScale = (width - padding * 2) / (priceHistory.length - 1 || 1)
    const yScale = (height - padding * 2) / (maxPrice - minPrice || 1)

    // Draw line
    ctx.beginPath()
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2
    priceHistory.forEach((point, i) => {
      const x = padding + i * xScale
      const y = height - padding - (point.price - minPrice) * yScale
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Draw dots
    priceHistory.forEach((point, i) => {
      const x = padding + i * xScale
      const y = height - padding - (point.price - minPrice) * yScale
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#2563eb'
      ctx.fill()
    })
  }, [priceHistory])

  if (priceHistory.length === 0) {
    return <p className="text-sm text-gray-400">Sin historial de precios disponible</p>
  }

  return (
    <div>
      <canvas ref={canvasRef} width={600} height={200} className="w-full max-w-2xl" />
    </div>
  )
}
```

**Step 3: Create product detail page**

`web/src/app/producto/[id]/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PriceTable from '@/components/PriceTable'
import PriceChart from '@/components/PriceChart'
import SearchBar from '@/components/SearchBar'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (!product) notFound()

  // Get latest prices with supplier info
  const { data: allPrices } = await supabase
    .from('prices')
    .select('*, supplier:suppliers(*)')
    .eq('product_id', id)
    .order('scraped_at', { ascending: false })

  // Latest price per supplier
  const latestBySupplier = new Map()
  for (const price of allPrices || []) {
    if (!latestBySupplier.has(price.supplier_id)) {
      latestBySupplier.set(price.supplier_id, price)
    }
  }
  const currentPrices = Array.from(latestBySupplier.values())

  // Price history (last 30 days, lowest price per day)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const priceHistory = (allPrices || [])
    .filter(p => new Date(p.scraped_at) >= thirtyDaysAgo)
    .reduce((acc: { date: string; price: number; supplier: string }[], p) => {
      const date = new Date(p.scraped_at).toISOString().split('T')[0]
      const existing = acc.find(a => a.date === date)
      if (!existing || p.price < existing.price) {
        const filtered = acc.filter(a => a.date !== date)
        filtered.push({ date, price: p.price, supplier: p.supplier.name })
        return filtered
      }
      return acc
    }, [])
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/" className="text-2xl font-bold text-blue-600">DentalPrecios</a>
          <div className="flex-1"><SearchBar /></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex gap-6">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-32 h-32 object-contain" />
            ) : (
              <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center text-4xl">🦷</div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              {product.brand && <p className="text-gray-500 mt-1">{product.brand}</p>}
              {product.description && <p className="text-gray-600 mt-3">{product.description}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Comparar precios</h2>
          <PriceTable prices={currentPrices} />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Historial de precios (30 dias)</h2>
          <PriceChart priceHistory={priceHistory} />
        </div>
      </div>
    </main>
  )
}
```

**Step 4: Verify and commit**

```bash
npm run dev
# Visit http://localhost:3000/producto/some-uuid — should show 404 (no data yet, that's fine)
git add .
git commit -m "feat: build product detail page with price table and chart"
```

---

### Task 8: Build Categories Page

**Files:**
- Create: `web/src/app/categorias/page.tsx`
- Create: `web/src/app/categorias/[slug]/page.tsx`

**Step 1: Categories listing page**

`web/src/app/categorias/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SearchBar from '@/components/SearchBar'

export default async function CategoriesPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .is('parent_id', null)
    .order('name')

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/" className="text-2xl font-bold text-blue-600">DentalPrecios</a>
          <div className="flex-1"><SearchBar /></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Categorias</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories?.map((cat) => (
            <Link
              key={cat.id}
              href={`/categorias/${cat.slug}`}
              className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition text-center"
            >
              <span className="text-lg font-medium text-gray-800">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
```

**Step 2: Category detail page (shows products in category)**

`web/src/app/categorias/[slug]/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import ProductCard from '@/components/ProductCard'

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!category) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', category.id)
    .order('name')

  // Get prices for products
  const productIds = products?.map(p => p.id) || []
  const { data: prices } = productIds.length > 0
    ? await supabase
        .from('prices')
        .select('*, supplier:suppliers(*)')
        .in('product_id', productIds)
        .order('scraped_at', { ascending: false })
    : { data: [] }

  const latestPrices = new Map()
  for (const price of prices || []) {
    if (!latestPrices.has(price.product_id)) {
      latestPrices.set(price.product_id, new Map())
    }
    const pp = latestPrices.get(price.product_id)
    if (!pp.has(price.supplier_id)) {
      pp.set(price.supplier_id, price)
    }
  }

  const productsWithPrices = products?.map(product => {
    const pp = Array.from(latestPrices.get(product.id)?.values() || [])
    const inStock = pp.filter((p: any) => p.in_stock)
    return {
      ...product,
      prices: pp,
      lowest_price: inStock.length > 0 ? Math.min(...inStock.map((p: any) => p.price)) : 0,
      store_count: pp.length,
    }
  }) || []

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/" className="text-2xl font-bold text-blue-600">DentalPrecios</a>
          <div className="flex-1"><SearchBar /></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{category.name}</h1>
        <div className="space-y-4">
          {productsWithPrices.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {productsWithPrices.length === 0 && (
          <p className="text-center py-16 text-gray-400">No hay productos en esta categoria aun</p>
        )}
      </div>
    </main>
  )
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: build categories pages"
```

---

## Phase 3: Authentication & User Features

### Task 9: Build Auth Pages (Login/Register)

**Files:**
- Create: `web/src/app/ingresar/page.tsx`
- Create: `web/src/app/auth/callback/route.ts`

**Step 1: Login/Register page**

`web/src/app/ingresar/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/mi-cuenta')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else {
        setError('')
        alert('Revisa tu correo para confirmar tu cuenta')
      }
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm p-8 w-full max-w-md">
        <a href="/" className="text-2xl font-bold text-blue-600 block text-center mb-8">
          DentalPrecios
        </a>

        <h2 className="text-xl font-semibold text-center mb-6">
          {isLogin ? 'Iniciar sesion' : 'Crear cuenta'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contrasena"
            required
            minLength={6}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Cargando...' : isLogin ? 'Iniciar sesion' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {isLogin ? 'No tienes cuenta?' : 'Ya tienes cuenta?'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:underline"
          >
            {isLogin ? 'Registrate' : 'Inicia sesion'}
          </button>
        </p>
      </div>
    </main>
  )
}
```

**Step 2: Auth callback route (for email confirmation)**

`web/src/app/auth/callback/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/mi-cuenta`)
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: build auth pages (login/register)"
```

---

### Task 10: Build User Dashboard

**Files:**
- Create: `web/src/app/mi-cuenta/page.tsx`
- Create: `web/src/app/api/favorites/route.ts`
- Create: `web/src/app/api/alerts/route.ts`

**Step 1: Favorites API**

`web/src/app/api/favorites/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await supabase
    .from('favorites')
    .select('*, product:products(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return Response.json({ favorites: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { product_id } = await request.json()
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: user.id, product_id })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { product_id } = await request.json()
  await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', product_id)

  return Response.json({ success: true })
}
```

**Step 2: Price alerts API**

`web/src/app/api/alerts/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await supabase
    .from('price_alerts')
    .select('*, product:products(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return Response.json({ alerts: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { product_id, target_price } = await request.json()
  const { error } = await supabase
    .from('price_alerts')
    .insert({ user_id: user.id, product_id, target_price })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}
```

**Step 3: User dashboard page**

`web/src/app/mi-cuenta/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/ingresar')

  const { data: favorites } = await supabase
    .from('favorites')
    .select('*, product:products(*)')
    .eq('user_id', user.id)

  const { data: alerts } = await supabase
    .from('price_alerts')
    .select('*, product:products(*)')
    .eq('user_id', user.id)
    .eq('active', true)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-blue-600">DentalPrecios</a>
          <span className="text-sm text-gray-600">{user.email}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mi cuenta</h1>

        {/* Favorites */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Mis favoritos</h2>
          {favorites && favorites.length > 0 ? (
            <div className="space-y-3">
              {favorites.map((fav: any) => (
                <Link
                  key={fav.id}
                  href={`/producto/${fav.product.id}`}
                  className="block bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition"
                >
                  <span className="font-medium">{fav.product.name}</span>
                  {fav.product.brand && (
                    <span className="text-sm text-gray-500 ml-2">{fav.product.brand}</span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">Aun no tienes productos favoritos</p>
          )}
        </section>

        {/* Price Alerts */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Mis alertas de precio</h2>
          {alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="bg-white p-4 rounded-lg shadow-sm">
                  <Link href={`/producto/${alert.product.id}`} className="font-medium hover:text-blue-600">
                    {alert.product.name}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    Alerta cuando el precio baje de {formatCLP(alert.target_price)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No tienes alertas de precio activas</p>
          )}
        </section>
      </div>
    </main>
  )
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: build user dashboard with favorites and alerts"
```

---

## Phase 4: PWA Configuration

### Task 11: Configure PWA

**Files:**
- Create: `web/src/app/manifest.ts`
- Create: `web/public/sw.js`
- Add icons to `web/public/`

**Step 1: Create web app manifest**

`web/src/app/manifest.ts`:

```typescript
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DentalPrecios — Comparador de precios dentales',
    short_name: 'DentalPrecios',
    description: 'Compara precios de productos dentales en Chile',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#2563eb',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

**Step 2: Create basic service worker**

`web/public/sw.js`:

```javascript
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())
```

**Step 3: Register service worker in layout**

Add to `web/src/app/layout.tsx` inside `<body>`:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
      }
    `,
  }}
/>
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: configure PWA manifest and service worker"
```

---

## Phase 5: Python Scrapers

### Task 12: Set Up Scraper Project

**Files:**
- Create: `scrapers/requirements.txt`
- Create: `scrapers/main.py`
- Create: `scrapers/base_scraper.py`
- Create: `scrapers/matchers.py`
- Create: `scrapers/suppliers/` directory

**Step 1: Create requirements.txt**

`scrapers/requirements.txt`:

```
requests>=2.31.0
beautifulsoup4>=4.12.0
playwright>=1.40.0
supabase>=2.0.0
python-dotenv>=1.0.0
```

**Step 2: Create base scraper**

`scrapers/base_scraper.py`:

```python
import requests
import time
import random
import logging
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]


class BaseScraper:
    """Base class for all supplier scrapers."""

    def __init__(self, supplier_name: str, base_url: str):
        self.supplier_name = supplier_name
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": random.choice(USER_AGENTS),
            "Accept-Language": "es-CL,es;q=0.9",
        })

    def fetch(self, url: str) -> BeautifulSoup | None:
        """Fetch a page and return parsed HTML."""
        try:
            time.sleep(random.uniform(1, 3))  # Respectful delay
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return BeautifulSoup(response.text, "html.parser")
        except Exception as e:
            logger.error(f"[{self.supplier_name}] Error fetching {url}: {e}")
            return None

    def scrape(self) -> list[dict]:
        """Override in subclass. Returns list of product dicts."""
        raise NotImplementedError

    def test(self) -> bool:
        """Override in subclass. Returns True if scraper selectors still work."""
        raise NotImplementedError
```

**Step 3: Create product matcher**

`scrapers/matchers.py`:

```python
import re


def normalize_name(name: str) -> str:
    """Normalize product name for matching."""
    name = name.lower().strip()
    name = re.sub(r'\s+', ' ', name)
    # Remove common filler words
    name = re.sub(r'\b(und|unid|unidad|unidades|pza|pieza|piezas|x\d+)\b', '', name)
    return name.strip()


def extract_brand(name: str) -> str | None:
    """Try to extract brand from product name."""
    known_brands = [
        "3m", "dentsply", "ivoclar", "kerr", "gc", "voco", "coltene",
        "ultradent", "maquira", "fgm", "angelus", "kulzer", "zhermack",
        "bisco", "septodont", "hu-friedy", "nsk", "woodpecker",
    ]
    name_lower = name.lower()
    for brand in known_brands:
        if brand in name_lower:
            return brand.upper()
    return None
```

**Step 4: Create main orchestrator**

`scrapers/main.py`:

```python
import os
import logging
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Import scrapers here as they are created
# from suppliers.dentalmarket import DentalMarketScraper

SCRAPERS = [
    # Add scraper instances here:
    # DentalMarketScraper(),
]


def main():
    supabase = create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    total_products = 0
    total_errors = 0

    for scraper in SCRAPERS:
        logger.info(f"Starting scraper: {scraper.supplier_name}")

        # Test selectors first
        if not scraper.test():
            logger.error(f"[{scraper.supplier_name}] Selector test FAILED — skipping")
            total_errors += 1
            continue

        try:
            products = scraper.scrape()
            logger.info(f"[{scraper.supplier_name}] Scraped {len(products)} products")

            # Get supplier ID
            result = supabase.table("suppliers").select("id").eq("name", scraper.supplier_name).single().execute()
            if not result.data:
                logger.error(f"[{scraper.supplier_name}] Supplier not found in database")
                total_errors += 1
                continue

            supplier_id = result.data["id"]

            # Insert prices
            for product in products:
                # Try to match product by name
                match = supabase.table("products").select("id").ilike("name", f"%{product['name']}%").execute()
                if match.data:
                    product_id = match.data[0]["id"]
                    supabase.table("prices").insert({
                        "product_id": product_id,
                        "supplier_id": supplier_id,
                        "price": product["price"],
                        "product_url": product["url"],
                        "in_stock": product.get("in_stock", True),
                    }).execute()
                    total_products += 1
                else:
                    logger.warning(f"[{scraper.supplier_name}] Unmatched product: {product['name']}")

        except Exception as e:
            logger.error(f"[{scraper.supplier_name}] Scraper failed: {e}")
            total_errors += 1

    logger.info(f"Done. {total_products} prices updated, {total_errors} errors.")


if __name__ == "__main__":
    main()
```

**Step 5: Create example supplier scraper template**

`scrapers/suppliers/__init__.py`: (empty file)

`scrapers/suppliers/example.py`:

```python
"""
Example supplier scraper template.
Copy this file and adapt for each new dental supplier.
"""
from base_scraper import BaseScraper


class ExampleScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            supplier_name="Example Dental Store",
            base_url="https://example-dental.cl",
        )

    def test(self) -> bool:
        """Verify the site structure hasn't changed."""
        soup = self.fetch(self.base_url + "/productos")
        if not soup:
            return False
        # Check that expected CSS selectors still exist
        return bool(soup.select(".product-card"))

    def scrape(self) -> list[dict]:
        """Scrape all products from this supplier."""
        products = []
        page = 1

        while True:
            soup = self.fetch(f"{self.base_url}/productos?page={page}")
            if not soup:
                break

            cards = soup.select(".product-card")
            if not cards:
                break

            for card in cards:
                name = card.select_one(".product-name")
                price = card.select_one(".product-price")
                link = card.select_one("a")

                if name and price and link:
                    price_text = price.get_text(strip=True)
                    # Parse "$12.990" -> 12990
                    price_int = int(price_text.replace("$", "").replace(".", "").strip())

                    products.append({
                        "name": name.get_text(strip=True),
                        "price": price_int,
                        "url": self.base_url + link["href"],
                        "in_stock": True,
                    })

            page += 1

        return products
```

**Step 6: Commit**

```bash
git add scrapers/
git commit -m "feat: set up scraper infrastructure with base classes and example template"
```

---

### Task 13: Set Up GitHub Actions for Daily Scraping

**Files:**
- Create: `.github/workflows/scrape.yml`

**Step 1: Create workflow**

`.github/workflows/scrape.yml`:

```yaml
name: Daily Price Scrape

on:
  schedule:
    - cron: '0 7 * * *' # 7:00 UTC = ~4:00 AM Chile time
  workflow_dispatch: # Allow manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          cd scrapers
          pip install -r requirements.txt
          playwright install chromium

      - name: Run scrapers
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          cd scrapers
          python main.py
```

**Step 2: Commit**

```bash
git add .github/
git commit -m "feat: add GitHub Actions workflow for daily scraping"
```

---

## Phase 6: Expo Mobile App

### Task 14: Initialize Expo Project

**Step 1: Create Expo app**

```bash
cd "/Users/pabloatria/Desktop/App dental prices"
npx create-expo-app@latest mobile --template tabs
```

**Step 2: Install dependencies**

```bash
cd mobile
npx expo install expo-notifications expo-device expo-constants
npm install @supabase/supabase-js
```

**Step 3: Create app config**

Update `mobile/app.json` to include:

```json
{
  "expo": {
    "name": "DentalPrecios",
    "slug": "dental-precios",
    "scheme": "dentalprecios",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#2563eb"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.dentalprecios.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#2563eb"
      },
      "package": "com.dentalprecios.app"
    },
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "color": "#2563eb"
        }
      ]
    ]
  }
}
```

**Step 4: Create API client**

`mobile/lib/api.ts`:

```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

export async function searchProducts(query: string, page = 1) {
  const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}&page=${page}`)
  return res.json()
}

export async function getProduct(id: string) {
  const res = await fetch(`${API_URL}/api/products/${id}`)
  return res.json()
}
```

**Step 5: Create Supabase client**

`mobile/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 6: Commit**

```bash
cd "/Users/pabloatria/Desktop/App dental prices"
git add mobile/
git commit -m "feat: initialize Expo mobile app with tabs template"
```

---

### Task 15: Build Mobile App Screens

**Files:**
- Modify: `mobile/app/(tabs)/index.tsx` (Home/Search)
- Modify: `mobile/app/(tabs)/explore.tsx` (Categories)
- Create: `mobile/app/product/[id].tsx` (Product detail)
- Create: `mobile/components/SearchBar.tsx`
- Create: `mobile/components/ProductCard.tsx`

This task involves building out the mobile app screens that mirror the web app functionality. The screens will call the same Next.js API endpoints. Implementation follows standard Expo Router patterns with React Native components styled to match the web app's blue theme.

**Step 1: Build mobile SearchBar, ProductCard, and screen components**

(These follow the same patterns as the web components but use React Native primitives: View, Text, TextInput, TouchableOpacity, FlatList instead of HTML elements.)

**Step 2: Verify on simulator**

```bash
cd mobile
npx expo start
# Press i for iOS simulator or a for Android emulator
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: build mobile app home, search, and product detail screens"
```

---

### Task 16: Add AdMob to Mobile App

**Step 1: Install AdMob**

```bash
cd mobile
npx expo install react-native-google-mobile-ads
```

**Step 2: Configure in app.json**

Add to plugins array:

```json
["react-native-google-mobile-ads", {
  "androidAppId": "ca-app-pub-xxxxxxxx~yyyyyyyy",
  "iosAppId": "ca-app-pub-xxxxxxxx~yyyyyyyy"
}]
```

**Step 3: Add banner ads to search results and product detail screens**

**Step 4: Build with EAS (required for native modules)**

```bash
eas build:configure
eas build --platform all --profile development
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: integrate AdMob ads in mobile app"
```

---

## Phase 7: Deployment

### Task 17: Deploy Web App to Vercel

**Step 1: Push to GitHub**

```bash
cd "/Users/pabloatria/Desktop/App dental prices"
# Create a GitHub repo first (via github.com or gh CLI)
gh repo create dental-precios --private
git remote add origin <repo-url>
git push -u origin main
```

**Step 2: Connect to Vercel**

1. Go to https://vercel.com
2. Import your GitHub repository
3. Set root directory to `web`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

**Step 3: Set up custom domain**

1. Buy a `.cl` domain (e.g., dentalprecios.cl)
2. In Vercel dashboard, go to project Settings > Domains
3. Add your domain and configure DNS

---

### Task 18: Build and Submit Mobile App

**Step 1: Configure EAS**

```bash
cd mobile
eas build:configure
```

**Step 2: Build for stores**

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

**Step 3: Submit to stores**

```bash
eas submit --platform ios
eas submit --platform android
```

---

## Phase 8: Seed Data & First Scraper

### Task 19: Research Chilean Dental Suppliers

Manually research and document Chilean dental product websites to scrape. Add them to the `suppliers` table in Supabase. Write the first real scraper for the most accessible site.

This task is manual/collaborative — requires the user to provide the list of supplier websites they know about, then we build scrapers one at a time.

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-4 | Project setup, database, Next.js init |
| 2 | 5-8 | Core web pages: home, search, product, categories |
| 3 | 9-10 | Authentication and user dashboard |
| 4 | 11 | PWA configuration |
| 5 | 12-13 | Python scrapers + GitHub Actions |
| 6 | 14-16 | Expo mobile app + AdMob |
| 7 | 17-18 | Deployment (Vercel + App Stores) |
| 8 | 19 | Seed data and first real scraper |

Total: 19 tasks across 8 phases. Phases 2-4 (web) and Phase 5 (scrapers) can be worked on in parallel.
