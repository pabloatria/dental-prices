import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || ''

  if (q.length < 2) {
    return Response.json({ products: [] })
  }

  const supabase = await createClient()

  const sanitized = q.replace(/[\\%_]/g, '\\$&')
  const { data: products } = await supabase
    .from('products')
    .select('id, name, brand, category_id')
    .or(`search_vector.wfts(dental_spanish).${q},name.ilike.%${sanitized}%,brand.ilike.%${sanitized}%`)
    .limit(6)

  return Response.json({ products: products || [] })
}
