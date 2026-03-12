export interface Product {
  id: string
  name: string
  brand: string | null
  category_id: string | null
  description: string | null
  image_url: string | null
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
