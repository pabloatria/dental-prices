import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 3600 // Refresh every hour

export async function GET() {
  const supabase = await createClient()

  // Get latest prices that have original_price set (supplier is running a sale)
  // Ordered by scraped_at DESC so dedup keeps the most recent per product+supplier
  const { data: offerPrices, error } = await supabase
    .from('prices')
    .select(`
      id,
      product_id,
      supplier_id,
      price,
      original_price,
      product_url,
      scraped_at,
      products!inner (
        id,
        name,
        brand,
        image_url,
        category_id
      ),
      suppliers!inner (
        id,
        name,
        website_url
      )
    `)
    .not('original_price', 'is', null)
    .gt('original_price', 0)
    .order('scraped_at', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Keep only the latest price per (product_id, supplier_id)
  const seen = new Set<string>()
  const latest = (offerPrices || []).filter(row => {
    const key = `${row.product_id}:${row.supplier_id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Filter: original_price must be > price * 1.10 (at least 10% off)
  const offers = latest
    .filter((row: any) => row.original_price > row.price * 1.10)
    .map((row: any) => {
      const discountPct = Math.round(
        ((row.original_price - row.price) / row.original_price) * 100
      )
      return {
        product_id: row.product_id,
        product_name: row.products.name,
        brand: row.products.brand,
        image_url: row.products.image_url,
        price: row.price,
        original_price: row.original_price,
        discount_pct: discountPct,
        supplier_id: row.supplier_id,
        supplier_name: row.suppliers.name,
        product_url: row.product_url,
        scraped_at: row.scraped_at,
      }
    })
    .sort((a: any, b: any) => b.discount_pct - a.discount_pct)
    .slice(0, 100)

  return NextResponse.json({ offers, total: offers.length })
}
