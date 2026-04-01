import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const url = request.nextUrl.searchParams.get('url')
  const productId = request.nextUrl.searchParams.get('product')
  const supplierId = request.nextUrl.searchParams.get('supplier')

  if (!url) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Log the click event asynchronously (don't block the redirect)
  // Skip bot clicks — only track real user visits
  const userAgent = request.headers.get('user-agent') || ''
  const isBot = /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu|gptbot|claudebot/i.test(userAgent)

  if (productId && supplierId && !isBot) {
    void supabase
      .from('click_events')
      .insert({
        product_id: productId,
        supplier_id: supplierId,
        url,
        referrer: request.headers.get('referer') || null,
        user_agent: userAgent,
      })
      .then(() => {})
  }

  return NextResponse.redirect(url)
}
