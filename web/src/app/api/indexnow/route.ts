import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const INDEXNOW_KEY = 'aebf338470e93d271032db1d35ff52ab'
const SITE_URL = 'https://www.dentalprecios.cl'
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Build list of URLs to submit
  const urls: string[] = [
    SITE_URL,
    `${SITE_URL}/categorias`,
    `${SITE_URL}/ofertas`,
    `${SITE_URL}/blog`,
  ]

  // Add all category pages
  const { data: categories } = await supabase
    .from('categories')
    .select('slug')
    .is('parent_id', null)

  for (const cat of categories || []) {
    urls.push(`${SITE_URL}/categorias/${cat.slug}`)
  }

  // Add recent blog posts
  urls.push(`${SITE_URL}/blog/caso-practico-ahorro-dentalprecios-2026`)
  urls.push(`${SITE_URL}/blog/implantes-dentales-precio-chile-2026`)
  urls.push(`${SITE_URL}/blog/lupas-odontologia-chile-2026`)
  urls.push(`${SITE_URL}/blog/mejores-resinas-dentales-2026`)
  urls.push(`${SITE_URL}/blog/acido-grabador-dental-chile`)

  // Submit to IndexNow
  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'www.dentalprecios.cl',
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls.slice(0, 10000), // IndexNow max 10k per request
      }),
    })

    return NextResponse.json({
      success: true,
      status: response.status,
      urlsSubmitted: urls.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit to IndexNow', details: String(error) },
      { status: 500 }
    )
  }
}
