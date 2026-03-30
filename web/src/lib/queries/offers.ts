import { SupabaseClient } from '@supabase/supabase-js'

export interface OfferItem {
  product_id: string
  supplier_id: string
  product_name: string
  brand: string | null
  image_url: string | null
  price: number
  original_price: number
  discount_pct: number
  supplier_name: string
  product_url: string
}

export async function fetchActiveOffers(
  supabase: SupabaseClient,
  limit = 500
): Promise<OfferItem[]> {
  const { data } = await supabase
    .from('prices')
    .select(`
      product_id,
      supplier_id,
      price,
      original_price,
      product_url,
      scraped_at,
      products!inner ( id, name, brand, image_url ),
      suppliers!inner ( id, name )
    `)
    .not('original_price', 'is', null)
    .gt('original_price', 0)
    .order('scraped_at', { ascending: false })
    .limit(limit)

  const seen = new Set<string>()
  return ((data || []) as any[])
    .filter(row => {
      const key = `${row.product_id}:${row.supplier_id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .filter(row => row.original_price > row.price * 1.10)
    .map(row => ({
      product_id: row.product_id,
      supplier_id: row.supplier_id,
      product_name: row.products.name,
      brand: row.products.brand ?? null,
      image_url: row.products.image_url ?? null,
      price: row.price as number,
      original_price: row.original_price as number,
      discount_pct: Math.round(((row.original_price - row.price) / row.original_price) * 100),
      supplier_name: row.suppliers.name,
      product_url: (row.product_url as string) || '',
    }))
    .sort((a, b) => b.discount_pct - a.discount_pct)
}
