/**
 * Shared helpers for the public v1 API at /api/v1/*.
 *
 * Track 1 of the three-track agent-commerce roadmap. This is the read-only
 * REST surface that agents (Claude, ChatGPT, custom integrations) and partners
 * call to query the catalog. Companion to the MCP server (planned).
 *
 * Discipline:
 * - Read-only. No write endpoints in v1.
 * - No PII in or out. The API does not accept dentist identifiers and does
 *   not return any personal data.
 * - Stable, versioned response shapes. Breaking changes require a v2 path.
 * - CORS open for read. Rate limiting is platform-level (Vercel) for now.
 */

import { NextResponse } from 'next/server'

const BASE_URL = 'https://www.dentalprecios.cl'

export interface ApiProductSummary {
  id: string
  name: string
  brand: string | null
  category_id: string | null
  image_url: string | null
  url: string
}

export interface ApiOffer {
  supplier_id: string
  supplier_name: string
  supplier_website: string | null
  price: number
  currency: 'CLP'
  original_price: number | null
  discount_pct: number | null
  in_stock: boolean
  scraped_at: string
  buy_url: string
}

/**
 * Standard JSON response with the headers we want on every v1 endpoint:
 * - CORS open for read
 * - JSON content type
 * - No-cache by default (override per route if appropriate)
 * - X-Robots-Tag noindex (already enforced globally for /api/* but explicit
 *   here so v1 responses are unambiguous to crawlers)
 */
export function apiJson<T>(
  data: T,
  init: { status?: number; cacheControl?: string } = {},
): NextResponse {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control':
        init.cacheControl ?? 'public, s-maxage=300, stale-while-revalidate=600',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

export function apiError(
  message: string,
  status: number,
  detail?: unknown,
): NextResponse {
  return apiJson(
    { error: message, ...(detail !== undefined ? { detail } : {}) },
    { status, cacheControl: 'no-store' },
  )
}

export function buildProductUrl(productId: string): string {
  return `${BASE_URL}/producto/${productId}`
}

export function shapeOffer(row: any): ApiOffer {
  const original = row.original_price && row.original_price > row.price ? row.original_price : null
  const discount = original ? Math.round(((original - row.price) / original) * 100) : null
  return {
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name ?? row.supplier?.name ?? '',
    supplier_website: row.supplier_website_url ?? row.supplier?.website_url ?? null,
    price: row.price,
    currency: 'CLP',
    original_price: original,
    discount_pct: discount,
    in_stock: !!row.in_stock,
    scraped_at: row.scraped_at,
    buy_url: row.product_url ?? '',
  }
}

export function shapeProductSummary(row: any): ApiProductSummary {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? null,
    category_id: row.category_id ?? null,
    image_url: row.image_url ?? null,
    url: buildProductUrl(row.id),
  }
}
