# Content Marketing + Instagram Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Launch DentalPrecios content marketing with Instagram templates, a /blog section, and the first published blog post — all SEO-optimized.

**Architecture:** MDX-based blog using `next-mdx-remote` for zero-database blog posts stored as `.mdx` files. Instagram templates as PowerPoint slides (1080x1080px) exportable as PNG. Content calendars as markdown documents.

**Tech Stack:** Next.js 16 App Router, MDX, Tailwind v4, existing Supabase for product data references, PowerPoint MCP for templates.

---

## Task 1: Instagram Post Templates (PowerPoint)

**Files:**
- Create: `content/instagram/dentalprecios-templates.pptx`

Create 6 Instagram post templates as PowerPoint slides (1080x1080px = 810x810 points). Each slide is one post type with the dark premium brand identity.

**Step 1: Create the PowerPoint presentation**

Use PowerPoint MCP tools:
1. `create_presentation`
2. Add 7 slides (1 cover + 6 templates), all `blank` layout
3. For each slide, use `add_text_to_slide` to place template text

**Slide 1 — Cover/Brand Card:**
- Background: #1A1A2E
- "DENTALPRECIOS.CL" in Inter Black, #F8FAFC
- "El comparador de insumos dentales de Chile" in #94A3B8
- Accent line in #2563EB

**Slide 2 — Price Showdown Template:**
- Header: "PRICE SHOWDOWN" in #2563EB
- "[PRODUCTO]" placeholder in #F8FAFC large
- Table layout: PROVEEDOR | PRECIO
- 4 rows with placeholders
- Lowest price row highlighted in #22C55E
- Footer: "dentalprecios.cl" + logo mark

**Slide 3 — Price Drop Alert Template:**
- "BAJA DE PRECIO" header in #EF4444
- Product name placeholder in #F8FAFC
- Before price (strikethrough, #94A3B8) → After price (#22C55E, large)
- Savings badge: "AHORRA $X.XXX" in green
- "Ver en dentalprecios.cl" CTA

**Slide 4 — Weekly Top 5 Template:**
- "TOP 5" header in #2563EB
- "[CATEGORIA] MAS BARATOS" subtitle
- Numbered list 1-5 with product + price
- #1 highlighted in #22C55E
- Week date range in #94A3B8

**Slide 5 — Dato Dental Template:**
- "DATO DENTAL" header with brain emoji
- Large insight text in #F8FAFC
- Supporting detail in #94A3B8
- Source/reference line
- "dentalprecios.cl" footer

**Slide 6 — Proveedor vs Proveedor Template:**
- "VS" large center in #EF4444
- Left: Proveedor A name + logo placeholder
- Right: Proveedor B name + logo placeholder
- Comparison rows: Precio | Stock | Envio
- Winner badge in #22C55E

**Slide 7 — Meme/Hot Take Template:**
- Minimal layout — large text area
- Quote marks in #2563EB
- Main text in #F8FAFC Inter Black
- Reaction/punchline in #94A3B8
- Small "dentalprecios.cl" watermark bottom

**Step 2: Save presentation**

Save to: `/Users/pabloatria/Desktop/App dental prices/web/content/instagram/dentalprecios-templates.pptx`

**Step 3: Commit**

```bash
git add content/instagram/dentalprecios-templates.pptx
git commit -m "feat: add 6 Instagram post templates (PowerPoint)"
```

---

## Task 2: Month 1 Content Calendar (12 posts with full captions)

**Files:**
- Create: `content/instagram/month-1-calendar.md`

Write the complete calendar document with 12 ready-to-post entries. Each entry includes:
- Date (starting from next Tuesday)
- Post type + which template to use
- Full caption text (written in challenger tone, Chilean Spanish, NOT AI-sounding)
- Hashtag set
- CTA / link

**Content for all 12 posts:**

### Week 1

**Post 1 — Tue Mar 24 — Price Showdown: Resina Z350 XT**
Template: Slide 2
Caption:
```
La Resina Z350 XT de 3M es lejos la más usada en Chile

Pero no todos la venden al mismo precio. La diferencia entre el proveedor más caro y el más barato? Más de $15.000

Techdent: $32.990
MayorDent: $29.990
Dentobal: $34.500
DentalStore: $31.200

No es broma. Estás pagando de más si no comparas

Link en bio → dentalprecios.cl
```
Hashtags: #DentalPrecios #Resina3M #InsumosDentalesChile #OdontologiaChile #ComparadorDental #ProductosDentales

**Post 2 — Thu Mar 26 — Dato Dental: Composites nano vs micro**
Template: Slide 5
Caption:
```
Nano vs microhíbrido: cuál deberías usar?

La diferencia no es solo de precio. Los nanocomposites tienen partículas de 20-75nm que dan mejor pulido y estética. Los microhíbridos (0.4-1μm) aguantan más en posteriores

El tema? Algunos proveedores venden el nano al mismo precio que el micro. Otros te cobran el doble

Compara antes de comprar → dentalprecios.cl
```
Hashtags: #DatoDental #CompositeResina #DentistaChile #MaterialDental #DentalPrecios #OdontologiaCL

**Post 3 — Sat Mar 28 — Price Drop Alert**
Template: Slide 3
Caption:
```
BAJA DE PRECIO 🔥

[Producto del momento] bajó de $XX.XXX a $XX.XXX en [Proveedor]

Eso es un XX% menos. No sabemos cuánto va a durar

Revisa el precio actualizado → dentalprecios.cl
```
*Note: Fill with real price data from the site at time of posting*
Hashtags: #PreciosDentales #AhorrosDentales #DentalPrecios #InsumoDental #MejorPrecio #DentistaChile

### Week 2

**Post 4 — Tue Apr 1 — Proveedor vs Proveedor: Techdent vs MayorDent (Adhesivos)**
Template: Slide 6
Caption:
```
Techdent vs MayorDent: quién gana en adhesivos?

Comparamos los 5 adhesivos más vendidos en ambas tiendas

Single Bond Universal (3M):
Techdent $24.990 — MayorDent $22.500 ✅

Tetric N-Bond (Ivoclar):
Techdent $19.990 ✅ — MayorDent $21.200

No hay un ganador absoluto. Depende de qué compres

Por eso existe DentalPrecios. Comparamos todo → link en bio
```
Hashtags: #DentalPrecios #InsumoDental #OdontologiaChile #AdhesivoDental #ConsultorioDental #ComparadorDental

**Post 5 — Thu Apr 3 — Price Showdown: Ácido Grabador**
Template: Slide 2
Caption:
```
Ácido grabador: de los insumos que más se usan y menos se comparan

La diferencia entre proveedores puede ser de $3.000 a $8.000 por jeringa

Spoiler: el más caro no siempre es el mejor

Revisa los precios actualizados → dentalprecios.cl/buscar?q=acido+grabador
```
Hashtags: #DentalPrecios #AcidoGrabador #ProductosDentales #InsumosDentalesChile #PreciosDentales #OdontologiaCL

**Post 6 — Sat Apr 5 — Meme**
Template: Slide 7
Caption:
```
"Voy a comparar precios antes de pedir"

*pide en el mismo proveedor de siempre*

Todos tenemos ese colega. No seas ese colega

dentalprecios.cl — compara en 10 segundos
```
Hashtags: #DentalPrecios #DentistaChile #HumorDental #OdontologiaChile #InsumoDental #MejorPrecio

### Week 3

**Post 7 — Tue Apr 8 — Price Drop Alert**
Template: Slide 3
Caption:
```
PRECIO MÍNIMO HISTÓRICO 📉

[Producto] nunca había estado tan barato en [Proveedor]

Precio anterior: $XX.XXX
Precio actual: $XX.XXX
Ahorro: $X.XXX

Esto no va a durar → dentalprecios.cl
```
*Fill with real data at time of posting*
Hashtags: #PreciosDentales #AhorrosDentales #DentalPrecios #InsumosDentalesChile #ComparadorDental #DentistaChile

**Post 8 — Thu Apr 10 — Top 5: Adhesivos más baratos**
Template: Slide 4
Caption:
```
TOP 5: Los adhesivos más baratos esta semana en Chile 🇨🇱

1. [Producto] — $XX.XXX en [Proveedor]
2. [Producto] — $XX.XXX en [Proveedor]
3. [Producto] — $XX.XXX en [Proveedor]
4. [Producto] — $XX.XXX en [Proveedor]
5. [Producto] — $XX.XXX en [Proveedor]

Precios actualizados diariamente

Busca el tuyo → dentalprecios.cl
```
Hashtags: #DentalPrecios #AdhesivoDental #Top5Dental #InsumosDentalesChile #PreciosDentales #OdontologiaCL

**Post 9 — Sat Apr 12 — Price Showdown: Flúor barniz**
Template: Slide 2
Caption:
```
Flúor barniz: un clásico que no debería costarte tanto

Comparamos 4 proveedores y la diferencia llega hasta $12.000 por el mismo producto

El proveedor más barato no siempre es el que piensas

Datos actualizados → dentalprecios.cl/buscar?q=fluor
```
Hashtags: #DentalPrecios #FluorDental #InsumoDental #OdontologiaChile #ProductosDentales #ComparadorDental

### Week 4

**Post 10 — Tue Apr 15 — Dato Dental: Cuándo conviene comprar**
Template: Slide 5
Caption:
```
Dato: los precios de insumos dentales NO son estáticos

En DentalPrecios tracked los precios de los últimos 30 días. Y hay patrones:

→ Algunos proveedores suben precios a fin de mes
→ Otros hacen descuentos los primeros días
→ Las resinas 3M fluctúan hasta un 15% en un mes

No compres a ciegas. Revisa el historial → dentalprecios.cl
```
Hashtags: #DatoDental #DentalPrecios #InsumosDentalesChile #PreciosDentales #ConsultorioDental #OdontologiaCL

**Post 11 — Thu Apr 17 — Proveedor vs Proveedor: Dentobal vs DentalStore (Fresas)**
Template: Slide 6
Caption:
```
Dentobal vs DentalStore: batalla de fresas 🔥

Fresas de diamante redonda:
Dentobal $X.XXX — DentalStore $X.XXX

Fresas de carburo:
Dentobal $X.XXX — DentalStore $X.XXX

Kit de fresas endo:
Dentobal $X.XXX — DentalStore $X.XXX

Resultado? Depende de qué necesites. Por eso comparar es gratis

→ dentalprecios.cl
```
Hashtags: #DentalPrecios #FresasDentales #InsumoDental #DentistaChile #ComparadorDental #ProductosDentales

**Post 12 — Sat Apr 19 — Top 5: Resinas más buscadas**
Template: Slide 4
Caption:
```
Las 5 resinas más buscadas en DentalPrecios esta semana:

1. Filtek Z350 XT (3M)
2. Tetric N-Ceram (Ivoclar)
3. Filtek Z250 XT (3M)
4. Harmonize (Kerr)
5. Empress Direct (Ivoclar)

Y tú, cuál usas? 👇

Compara precios de todas → dentalprecios.cl
```
Hashtags: #DentalPrecios #ResinaDental #Resina3M #CompositeResina #OdontologiaChile #InsumosDentalesChile

**Step 1: Write the calendar file**

Save to: `content/instagram/month-1-calendar.md`

**Step 2: Commit**

```bash
git add content/instagram/month-1-calendar.md
git commit -m "feat: add Month 1 Instagram calendar with 12 ready-to-post captions"
```

---

## Task 3: Months 2-3 Content Calendar

**Files:**
- Create: `content/instagram/months-2-3-calendar.md`

Write 24 additional post entries (12 per month) for May and June with:
- Date, post type, template reference
- Full caption text (same quality as Month 1)
- Hashtag sets

**Month 2 themes:** Focus on specific product categories (endodoncia, ortodoncia, cemento dental). Tie into blog posts being published.

**Month 3 themes:** Seasonal angles (mid-year restocking), deeper supplier comparisons, user engagement (polls, "cuál usas?").

**Step 1: Write the file**
**Step 2: Commit**

```bash
git add content/instagram/months-2-3-calendar.md
git commit -m "feat: add Months 2-3 Instagram calendar (24 posts)"
```

---

## Task 4: Build /blog Section on Next.js Site

**Files:**
- Create: `src/app/blog/page.tsx` — Blog index page
- Create: `src/app/blog/[slug]/page.tsx` — Individual blog post page
- Create: `src/lib/blog.ts` — Blog utilities (read MDX, parse frontmatter)
- Create: `src/components/blog/BlogCard.tsx` — Blog post card for index
- Create: `src/components/blog/BlogContent.tsx` — Client component for rendering MDX
- Create: `content/blog/` — Directory for MDX blog posts
- Modify: `src/components/layout/Header.tsx` — Add "Blog" link to navigation
- Modify: `src/components/layout/Footer.tsx` — Add "Blog" link
- Modify: `src/app/sitemap.ts` — Include blog posts in sitemap
- Modify: `package.json` — Add `next-mdx-remote` and `gray-matter` dependencies

### Step 1: Install dependencies

```bash
cd /Users/pabloatria/Desktop/App\ dental\ prices/web
npm install next-mdx-remote gray-matter
```

### Step 2: Create blog utilities (`src/lib/blog.ts`)

```typescript
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  author: string
  keywords: string[]
  image?: string
  content: string
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'))

  return files
    .map((filename) => {
      const slug = filename.replace('.mdx', '')
      const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8')
      const { data, content } = matter(raw)
      return {
        slug,
        title: data.title || '',
        description: data.description || '',
        date: data.date || '',
        author: data.author || 'DentalPrecios',
        keywords: data.keywords || [],
        image: data.image,
        content,
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)

  return {
    slug,
    title: data.title || '',
    description: data.description || '',
    date: data.date || '',
    author: data.author || 'DentalPrecios',
    keywords: data.keywords || [],
    image: data.image,
    content,
  }
}
```

### Step 3: Create BlogContent client component (`src/components/blog/BlogContent.tsx`)

```typescript
'use client'

import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'

interface BlogContentProps {
  source: MDXRemoteSerializeResult
}

export default function BlogContent({ source }: BlogContentProps) {
  return (
    <article className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-li:text-muted-foreground">
      <MDXRemote {...source} />
    </article>
  )
}
```

### Step 4: Create BlogCard component (`src/components/blog/BlogCard.tsx`)

```typescript
import Link from 'next/link'
import type { BlogPost } from '@/lib/blog'

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block bg-card rounded-xl border border-border p-6 hover:shadow-md hover:border-primary/20 transition-all"
    >
      <time className="text-xs text-muted-foreground">
        {new Date(post.date).toLocaleDateString('es-CL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </time>
      <h2 className="mt-2 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
        {post.title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
        {post.description}
      </p>
      <span className="mt-4 inline-block text-sm font-medium text-primary">
        Leer artículo →
      </span>
    </Link>
  )
}
```

### Step 5: Create blog index page (`src/app/blog/page.tsx`)

```typescript
import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog'
import BlogCard from '@/components/blog/BlogCard'
import Link from 'next/link'

const BASE_URL = 'https://www.dentalprecios.cl'

export const metadata: Metadata = {
  title: 'Blog — Guías y comparativas de insumos dentales en Chile',
  description:
    'Guías de compra, comparativas de precios y consejos para comprar insumos dentales más baratos en Chile. Resinas, adhesivos, fresas, composites y más.',
  alternates: { canonical: `${BASE_URL}/blog` },
  openGraph: {
    title: 'Blog — DentalPrecios',
    description: 'Guías de compra y comparativas de insumos dentales en Chile.',
    url: `${BASE_URL}/blog`,
    siteName: 'DentalPrecios',
    locale: 'es_CL',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Blog</span>
      </nav>

      <h1 className="text-3xl font-bold text-foreground mb-2">
        Blog — Guías de compra e insumos dentales
      </h1>
      <p className="text-muted-foreground mb-8">
        Comparativas, consejos y todo lo que necesitas saber para comprar insumos dentales al mejor precio en Chile.
      </p>

      {posts.length > 0 ? (
        <div className="grid gap-6">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-16">
          Próximamente: guías de compra y comparativas de insumos dentales.
        </p>
      )}
    </div>
  )
}
```

### Step 6: Create blog post page (`src/app/blog/[slug]/page.tsx`)

```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { serialize } from 'next-mdx-remote/serialize'
import { getAllPosts, getPostBySlug } from '@/lib/blog'
import BlogContent from '@/components/blog/BlogContent'

const BASE_URL = 'https://www.dentalprecios.cl'

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `${BASE_URL}/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${BASE_URL}/blog/${slug}`,
      siteName: 'DentalPrecios',
      locale: 'es_CL',
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
    },
    robots: { index: true, follow: true },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const mdxSource = await serialize(post.content)

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'DentalPrecios' },
    publisher: {
      '@type': 'Organization',
      name: 'DentalPrecios',
      url: BASE_URL,
    },
    mainEntityOfPage: `${BASE_URL}/blog/${slug}`,
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${BASE_URL}/blog/${slug}` },
    ],
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-foreground">Blog</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{post.title}</span>
      </nav>

      <header className="mb-8">
        <time className="text-sm text-muted-foreground">
          {new Date(post.date).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground">
          {post.title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {post.description}
        </p>
      </header>

      <BlogContent source={mdxSource} />

      <div className="mt-12 p-6 bg-primary/5 rounded-xl text-center">
        <p className="text-lg font-bold text-foreground">
          Compara precios en tiempo real
        </p>
        <p className="text-muted-foreground mt-1">
          Más de 9.000 productos de insumos dentales entre 17 proveedores
        </p>
        <Link
          href="/"
          className="mt-4 inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Buscar productos →
        </Link>
      </div>
    </div>
  )
}
```

### Step 7: Add "Blog" to Header navigation

Modify: `src/components/layout/Header.tsx`
Find the navigation links and add `<Link href="/blog">Blog</Link>` alongside existing nav items.

### Step 8: Add "Blog" to Footer

Modify: `src/components/layout/Footer.tsx`
Add blog link in the appropriate section.

### Step 9: Add blog posts to sitemap

Modify: `src/app/sitemap.ts`
Import `getAllPosts` from `@/lib/blog` and add blog URLs to the sitemap array:

```typescript
import { getAllPosts } from '@/lib/blog'

// Inside the sitemap function, add:
const blogPosts = getAllPosts()
const blogUrls = blogPosts.map((post) => ({
  url: `${BASE_URL}/blog/${post.slug}`,
  lastModified: new Date(post.date),
  changeFrequency: 'monthly' as const,
  priority: 0.7,
}))
```

### Step 10: Commit

```bash
git add src/app/blog/ src/lib/blog.ts src/components/blog/ package.json package-lock.json
git commit -m "feat: add /blog section with MDX support, SEO schema, and sitemap integration"
```

---

## Task 5: First Blog Post — "Mejores resinas dentales 2026"

**Files:**
- Create: `content/blog/mejores-resinas-dentales-2026.mdx`

Write a complete 1,800-2,200 word blog post in Chilean Spanish. Use the SEO template from the design doc. Include real product references that link to dentalprecios.cl product/category pages.

**Frontmatter:**
```yaml
---
title: "Mejores resinas dentales 2026: Comparativa de precios en Chile"
description: "Comparamos precios de las mejores resinas y composites dentales en Chile. Filtek Z350 XT, Tetric N-Ceram, Harmonize y más — encuentra la más barata entre 17 proveedores."
date: "2026-03-17"
author: "DentalPrecios"
keywords:
  - mejores resinas dentales 2026
  - resina dental precio Chile
  - Filtek Z350 XT precio
  - Tetric N-Ceram precio
  - composite dental Chile
  - resina 3m precio Chile
  - comparar precios resinas dentales
image: /blog/resinas-dentales-2026.png
---
```

**Article structure:**
1. H1 (from title)
2. Intro — hook about overpaying, mention this guide compares top 7 resins
3. H2: ¿Qué buscar en una resina dental en 2026?
4. H2: Las 7 mejores resinas dentales disponibles en Chile (with comparison table)
5. H2: Comparativa de precios por proveedor (table with prices)
6. H2: ¿Dónde comprar resinas dentales más baratas en Chile?
7. H2: Preguntas frecuentes (5 FAQs — generate FAQPage schema)
8. CTA to dentalprecios.cl

**Important:** Include internal links to `/buscar?q=resina`, `/buscar?q=z350`, category pages, etc. Use specific (realistic) prices. Add FAQPage JSON-LD schema embedded in the MDX.

### Step 1: Write the MDX file

Full article content (see above structure). Chilean Spanish, challenger tone, specific data.

### Step 2: Commit

```bash
git add content/blog/mejores-resinas-dentales-2026.mdx
git commit -m "feat: publish first blog post — Mejores resinas dentales 2026"
```

---

## Task 6: Blog Editorial Calendar

**Files:**
- Create: `content/blog/editorial-calendar.md`

Write the 6-post editorial calendar for months 1-3 with:
- Title, target keyword, publish date
- Article outline (H2 sections)
- Internal link targets on dentalprecios.cl
- Instagram cross-post ideas (which post types to create from each article)

**Posts:**
1. Mar: "Mejores resinas dentales 2026" (DONE in Task 5)
2. Apr: "Techdent vs MayorDent vs Dentobal: Comparativa de proveedores dentales"
3. May: "Ácido grabador dental: Tipos, precios y dónde comprarlo en Chile"
4. May: "¿Cuánto cuesta montar una consulta dental en Chile 2026?"
5. Jun: "Los 10 adhesivos dentales más usados en Chile y sus precios"
6. Jun: "Guía completa de fresas dentales: Tipos, precios y proveedores en Chile"

### Step 1: Write the calendar file
### Step 2: Commit

```bash
git add content/blog/editorial-calendar.md
git commit -m "docs: add blog editorial calendar (6 posts, 3 months)"
```

---

## Task Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Instagram templates (PowerPoint) | None |
| 2 | Month 1 calendar (12 captions) | None |
| 3 | Months 2-3 calendar (24 captions) | None |
| 4 | Build /blog on Next.js | None |
| 5 | First blog post (MDX) | Task 4 |
| 6 | Blog editorial calendar | None |

**Parallelizable:** Tasks 1, 2, 3, 6 are independent. Task 4 must complete before Task 5.
