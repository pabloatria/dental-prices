import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { createPublicClient } from '@/lib/supabase/public'
import type { Category } from '@/lib/types'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const BASE_URL = 'https://www.dentalprecios.cl'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  title: {
    default: 'Compara precios de insumos dentales en Chile | DentalPrecios',
    template: '%s | DentalPrecios',
  },
  description:
    'Compara precios de +14.000 productos dentales entre 20+ proveedores chilenos. Ahorra hasta 40% en resinas, adhesivos, instrumental y más.',
  keywords: [
    'insumos dentales Chile',
    'precios insumos dentales',
    'comparar precios dentales',
    'comparador productos dentales Chile',
    'materiales dentales Chile',
    'productos dentales Chile',
    'composite dental precio',
    'resina dental precio Chile',
    'resina 3m precio',
    'adhesivo dental precio',
    'fluor dental Chile',
    'acido grabador dental',
    'instrumental dental Chile',
    'tienda dental online Chile',
    'proveedores dentales Chile',
    'Techdent',
    'MayorDent',
    'Dentobal',
    'DentalStore',
    'fresas dentales precio',
    'cemento dental Chile',
    'endodoncia insumos precio',
    'ortodoncia materiales Chile',
  ],
  authors: [{ name: 'DentalPrecios' }],
  creator: 'DentalPrecios',
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    siteName: 'DentalPrecios',
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'DentalPrecios | Comparador de precios de insumos dentales en Chile',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [`${BASE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

async function getCategories(): Promise<Category[]> {
  try {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug, parent_id')
      .is('parent_id', null)
      .order('name')
    return (data as Category[]) || []
  } catch {
    return []
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const categories = await getCategories()

  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': `${BASE_URL}/#organization`,
                  name: 'DentalPrecios',
                  url: BASE_URL,
                  logo: {
                    '@type': 'ImageObject',
                    url: `${BASE_URL}/logo.png`,
                  },
                  description:
                    'Comparador de precios de insumos dentales en Chile. Compara precios entre múltiples proveedores.',
                },
                {
                  '@type': 'WebSite',
                  '@id': `${BASE_URL}/#website`,
                  url: BASE_URL,
                  name: 'DentalPrecios',
                  publisher: { '@id': `${BASE_URL}/#organization` },
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                      '@type': 'EntryPoint',
                      urlTemplate: `${BASE_URL}/buscar?q={search_term_string}`,
                    },
                    'query-input': 'required name=search_term_string',
                  },
                },
              ],
            }),
          }}
        />
        <Header categories={categories} />
        <main className="min-h-[calc(100vh-8rem)]">{children}</main>
        <Footer categories={categories} />
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics />
        <script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="gehQcSuxrToqglhlm+qTWw"
          async
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </body>
    </html>
  )
}
