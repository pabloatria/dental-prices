import { NextRequest } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { apiJson, apiError, shapeProductSummary } from '@/lib/api/v1-helpers'

interface ResolveRequest {
  brand?: string
  family?: string
  variant?: string
  pack_size?: string
  full_query?: string
}

/**
 * POST /api/v1/products/resolve
 *
 * Disambiguation helper for agents. Given structured fragments (brand,
 * product family, variant, pack size) extracted from a free-text request,
 * return either:
 *   - one canonical product (high confidence), or
 *   - up to 5 candidates ranked by best match (ambiguous, ask the user)
 *
 * v1 implementation uses Postgres ilike with weighted scoring. Track 1 week 2
 * upgrades this to a tsvector + trigram ranked search; the API contract stays
 * the same.
 *
 * Body example:
 *   {"brand":"Ivoclar","family":"Empress Direct","variant":"Enamel A2"}
 * or:
 *   {"full_query":"Ivoclar Empress Direct Enamel A2 5g"}
 */
export async function POST(request: NextRequest) {
  let body: ResolveRequest
  try {
    body = (await request.json()) as ResolveRequest
  } catch {
    return apiError('invalid JSON body', 400)
  }

  const tokens = [
    body.brand,
    body.family,
    body.variant,
    body.pack_size,
    body.full_query,
  ]
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 1)
    .map((t) => t.trim())

  if (tokens.length === 0) {
    return apiError(
      'provide at least one of: brand, family, variant, pack_size, full_query',
      400,
    )
  }

  const supabase = createPublicClient()

  // Strategy: query products that match ANY of the tokens, then score in-process
  // by how many tokens match per product. Bias toward brand and family matches.
  const escaped = tokens.map((t) => t.replace(/[%_]/g, (m) => `\\${m}`))
  const conditions = escaped.flatMap((t) => [`name.ilike.%${t}%`, `brand.ilike.%${t}%`])

  const { data, error } = await supabase
    .from('products')
    .select('id, name, brand, category_id, image_url')
    .or(conditions.join(','))
    .limit(50)

  if (error) return apiError('resolve query failed', 500, error.message)

  const candidates = (data ?? []).map((p) => {
    const text = `${p.name ?? ''} ${p.brand ?? ''}`.toLowerCase()
    let score = 0
    for (const t of tokens) {
      const tt = t.toLowerCase()
      if (text.includes(tt)) score += tt.length // weight by token length (longer = more specific)
      if ((p.brand ?? '').toLowerCase().includes(tt)) score += 5 // brand-match boost
    }
    return { product: p, score }
  })
  candidates.sort((a, b) => b.score - a.score)

  if (candidates.length === 0) {
    return apiJson({
      resolved: false,
      reason: 'no candidates matched the supplied tokens',
      candidates: [],
    })
  }

  const top = candidates[0]
  const second = candidates[1]
  const isUnambiguous =
    top.score > 0 && (!second || top.score >= second.score * 1.6)

  const items = candidates
    .slice(0, isUnambiguous ? 1 : 5)
    .map((c) => ({ ...shapeProductSummary(c.product), match_score: c.score }))

  return apiJson({
    resolved: isUnambiguous,
    candidate_count: items.length,
    candidates: items,
    note: isUnambiguous
      ? 'high-confidence single match'
      : 'multiple candidates; agent should ask the user to disambiguate',
  })
}

export async function OPTIONS() {
  return apiJson({ ok: true }, { cacheControl: 'no-store' })
}
