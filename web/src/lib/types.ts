export interface Product {
  id: string
  name: string
  brand: string | null
  category_id: string | null
  description: string | null
  image_url: string | null
  /**
   * Explicit pack count parsed from the product name (e.g. "2 Jeringas" → 2).
   * NULL when the name doesn't specify — do NOT assume 1. Used to keep
   * same-SKU-different-pack-size listings from being treated as duplicates,
   * and to display "$41,000 · pack de 2" on product cards.
   */
  pack_size?: number | null
}

export interface Supplier {
  id: string
  name: string
  website_url: string
  logo_url: string | null
}

export interface Price {
  id: string
  product_id: string
  supplier_id: string
  price: number
  product_url: string
  in_stock: boolean
  scraped_at: string
  supplier: Supplier
}

export interface ProductWithPrices extends Product {
  prices: Price[]
  lowest_price: number
  highest_price?: number
  store_count: number
  catalog_only: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  parent_id: string | null
  subcategories?: Category[]
}
