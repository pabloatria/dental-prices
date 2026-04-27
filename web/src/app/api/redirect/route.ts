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
  const source = request.nextUrl.searchParams.get('source') || 'product_page'

  if (!url) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const userAgent = request.headers.get('user-agent') || ''
  const isBot = /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu|gptbot|claudebot|perplexity|amazonbot|ccbot/i.test(userAgent)

  // AWAIT the insert before redirecting. The previous fire-and-forget
  // pattern (`void supabase.from(...).insert(...).then(() => {})`) silently
  // dropped clicks because Vercel's serverless function instance recycles
  // as soon as the response is returned, terminating the pending Promise
  // before the Supabase HTTP request actually completes. Cost: ~50-100ms
  // added latency; benefit: reliable click telemetry.
  if (productId && supplierId) {
    try {
      const { error } = await supabase
        .from('click_events')
        .insert({
          product_id: productId,
          supplier_id: supplierId,
          url,
          referrer: request.headers.get('referer') || null,
          user_agent: userAgent,
          source,
          is_bot: isBot,
        })
      if (error) {
        // Log but don't block the redirect — better to lose telemetry
        // for one event than break the user's journey to the supplier.
        console.error('[redirect] click_events insert failed:', error.message, { productId, supplierId })
      }
    } catch (e) {
      console.error('[redirect] click_events insert threw:', e)
    }
  }

  const response = NextResponse.redirect(url)
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
}
