import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
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

  // Find similar posts by keyword overlap
  const allPosts = getAllPosts().filter((p) => p.slug !== slug)
  const currentKeywords = new Set(post.keywords.map((k) => k.toLowerCase()))

  const similarPosts = allPosts
    .map((p) => {
      const overlap = p.keywords.filter((k) => currentKeywords.has(k.toLowerCase())).length
      return { ...p, overlap }
    })
    .filter((p) => p.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3)

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
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${BASE_URL}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `${BASE_URL}/blog/${slug}`,
      },
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
        <Link href="/" className="hover:text-foreground">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-foreground">
          Blog
        </Link>
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

      <BlogContent source={post.content} />

      <div className="mt-12 p-6 bg-primary/5 rounded-xl text-center">
        <p className="text-lg font-bold text-foreground">
          Compara precios en tiempo real
        </p>
        <p className="text-muted-foreground mt-1">
          Más de 20.000 productos de insumos dentales entre 70+ proveedores
        </p>
        <Link
          href="/"
          className="mt-4 inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Buscar productos →
        </Link>
      </div>

      {similarPosts.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Artículos relacionados
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {similarPosts.map((related) => (
              <Link
                key={related.slug}
                href={`/blog/${related.slug}`}
                className="group block p-4 bg-card rounded-xl border border-border hover:border-primary/40 transition-colors"
              >
                <time className="text-xs text-muted-foreground">
                  {new Date(related.date).toLocaleDateString('es-CL', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
                <h3 className="mt-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {related.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {related.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
