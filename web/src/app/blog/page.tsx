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
    description:
      'Guías de compra y comparativas de insumos dentales en Chile.',
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
        <Link href="/" className="hover:text-foreground">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Blog</span>
      </nav>

      <h1 className="text-3xl font-bold text-foreground mb-2">
        Blog — Guías de compra e insumos dentales
      </h1>
      <p className="text-muted-foreground mb-8">
        Comparativas, consejos y todo lo que necesitas saber para comprar
        insumos dentales al mejor precio en Chile.
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
