import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || ''

  if (q.length < 2) {
    return Response.json({ products: [] })
  }

  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, brand, category_id')
    .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
    .limit(6)

  return Response.json({ products: products || [] })
}
