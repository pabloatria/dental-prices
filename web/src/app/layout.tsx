import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/lib/types'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'DentalPrecios — Todo para tu consulta dental en un solo lugar',
  description:
    'Compara precios de insumos dentales, instrumental, est\u00E9tica facial y m\u00E1s entre los principales proveedores de Chile.',
}

async function getCategories(): Promise<Category[]> {
  try {
    const supabase = await createClient()
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
        <Header categories={categories} />
        <main className="min-h-[calc(100vh-8rem)]">{children}</main>
        <Footer categories={categories} />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </body>
    </html>
  )
}
