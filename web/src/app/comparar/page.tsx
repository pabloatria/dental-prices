import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllComparaciones } from '@/lib/comparaciones'

const BASE_URL = 'https://www.dentalprecios.cl'

export const metadata: Metadata = {
  title: 'Comparaciones de Insumos Dentales',
  description:
    'Comparaciones directas entre productos dentales: resinas, cementos, anestesia y más. Fichas técnicas reales y precios actualizados en Chile.',
  alternates: { canonical: `${BASE_URL}/comparar` },
  openGraph: {
    title: 'Comparaciones de Insumos Dentales',
    description:
      'Comparaciones directas entre productos dentales con fichas técnicas y precios reales en Chile.',
    url: `${BASE_URL}/comparar`,
    siteName: 'DentalPrecios',
    locale: 'es_CL',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export default function CompararIndexPage() {
  const comparaciones = getAllComparaciones()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Comparaciones</span>
      </nav>

      <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
        Comparaciones de productos dentales
      </h1>
      <p className="text-muted-foreground mb-8">
        Fichas técnicas reales, diferencias clínicas y precios actualizados entre productos del mismo segmento.
      </p>

      {comparaciones.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {comparaciones.map((c) => (
            <Link
              key={c.slug}
              href={`/comparar/${c.slug}`}
              className="group block p-5 bg-card rounded-xl border border-border hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                  Comparación
                </span>
                <time className="text-xs text-muted-foreground">
                  {new Date(c.date).toLocaleDateString('es-CL', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </div>
              <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                {c.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {c.description}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center py-12 text-muted-foreground">
          Próximamente: comparaciones de productos dentales con datos reales.
        </p>
      )}
    </div>
  )
}
