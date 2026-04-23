import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllComparaciones, getComparacionBySlug } from '@/lib/comparaciones'
import BlogContent from '@/components/blog/BlogContent'

const BASE_URL = 'https://www.dentalprecios.cl'

export async function generateStaticParams() {
  return getAllComparaciones().map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const comp = getComparacionBySlug(slug)
  if (!comp) return {}

  return {
    title: comp.title,
    description: comp.description,
    keywords: comp.keywords,
    alternates: { canonical: `${BASE_URL}/comparar/${slug}` },
    openGraph: {
      title: comp.title,
      description: comp.description,
      url: `${BASE_URL}/comparar/${slug}`,
      siteName: 'DentalPrecios',
      locale: 'es_CL',
      type: 'article',
      publishedTime: comp.date,
      authors: [comp.author],
    },
    robots: { index: true, follow: true },
  }
}

export default async function CompararPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const comp = getComparacionBySlug(slug)
  if (!comp) notFound()

  const allComps = getAllComparaciones().filter((c) => c.slug !== slug)
  const currentKeywords = new Set(comp.keywords.map((k) => k.toLowerCase()))
  const related = allComps
    .map((c) => ({
      ...c,
      overlap: c.keywords.filter((k) => currentKeywords.has(k.toLowerCase())).length,
    }))
    .filter((c) => c.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3)

  // JSON-LD, server-rendered trusted content only (MDX files, no user input)
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: comp.title,
    description: comp.description,
    datePublished: comp.date,
    author: { '@type': 'Organization', name: 'DentalPrecios' },
    publisher: { '@type': 'Organization', name: 'DentalPrecios', url: BASE_URL },
    mainEntityOfPage: `${BASE_URL}/comparar/${slug}`,
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Comparaciones', item: `${BASE_URL}/comparar` },
      { '@type': 'ListItem', position: 3, name: comp.title, item: `${BASE_URL}/comparar/${slug}` },
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
        <Link href="/comparar" className="hover:text-foreground">Comparaciones</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{comp.title}</span>
      </nav>

      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
            Comparación
          </span>
          <time className="text-sm text-muted-foreground">
            {new Date(comp.date).toLocaleDateString('es-CL', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          {comp.title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{comp.description}</p>
      </header>

      <BlogContent source={comp.content} />

      <div className="mt-12 p-6 bg-primary/5 rounded-xl text-center">
        <p className="text-lg font-bold text-foreground">
          Compara precios en tiempo real
        </p>
        <p className="text-muted-foreground mt-1">
          Más de 20.000 productos de insumos dentales entre 70+ proveedores
        </p>
        <Link
          href="/precios/resina-compuesta"
          className="mt-4 inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Ver precios de resinas →
        </Link>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Más comparaciones
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/comparar/${r.slug}`}
                className="group block p-4 bg-card rounded-xl border border-border hover:border-primary/40 transition-colors"
              >
                <time className="text-xs text-muted-foreground">
                  {new Date(r.date).toLocaleDateString('es-CL', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
                <h3 className="mt-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {r.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
