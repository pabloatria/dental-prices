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
  if (productId && supplierId) {
    void supabase
      .from('click_events')
      .insert({
        product_id: productId,
        supplier_id: supplierId,
        url,
        referrer: request.headers.get('referer') || null,
        user_agent: request.headers.get('user-agent') || null,
      })
      .then(() => {})
  }

  return NextResponse.redirect(url)
}
