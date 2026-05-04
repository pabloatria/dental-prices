import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'

const BASE_URL = 'https://www.dentalprecios.cl'
const IG_HANDLE = 'dentalprecios'
const IG_URL = `https://www.instagram.com/${IG_HANDLE}/`

export const metadata: Metadata = {
  title: 'Link in bio',
  description:
    'Las últimas guías y comparativas de precios de DentalPrecios para profesionales dentales en Chile.',
  alternates: { canonical: `${BASE_URL}/instagram` },
  robots: { index: false, follow: true },
  openGraph: {
    title: 'DentalPrecios — link in bio',
    description: 'Las últimas guías y comparativas de DentalPrecios.',
    url: `${BASE_URL}/instagram`,
    siteName: 'DentalPrecios',
    locale: 'es_CL',
    type: 'website',
  },
}

export const revalidate = 3600

function withUtm(slug: string): string {
  const params = new URLSearchParams({
    utm_source: 'instagram',
    utm_medium: 'link_in_bio',
    utm_content: slug,
  })
  return `/blog/${slug}?${params.toString()}`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function InstagramLinkInBioPage() {
  const todayIso = new Date().toISOString().slice(0, 10)
  const posts = getAllPosts()
    .filter((p) => p.date && p.date <= todayIso)
    .slice(0, 6)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <header className="text-center mb-10">
          <Link
            href="/"
            className="inline-block text-2xl font-bold tracking-tight text-foreground"
          >
            DentalPrecios
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            Comparador de insumos dentales en Chile
          </p>
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            <span>@{IG_HANDLE}</span>
          </a>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={withUtm(post.slug)}
              className="group relative aspect-square overflow-hidden rounded-lg transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl"
              style={{
                background:
                  'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              }}
            >
              <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-white/60">
                  DentalPrecios
                </p>
                <h2 className="text-sm sm:text-base font-semibold leading-snug text-white line-clamp-5">
                  {post.title}
                </h2>
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-white/50">
                  {formatDate(post.date)}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <footer className="mt-10 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Ver todas las guías
            <span aria-hidden="true">→</span>
          </Link>
          <p className="mt-6 text-xs text-muted-foreground">
            Precios actualizados cada 24 horas en{' '}
            <Link href="/" className="underline hover:text-foreground">
              dentalprecios.cl
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
