import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Total clicks 7d and 30d
  const { count: total7d } = await supabase
    .from('click_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo)

  const { count: total30d } = await supabase
    .from('click_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo)

  // Clicks by supplier (30d)
  const { data: bySupplier } = await supabase.rpc('click_counts_by_supplier', {
    since: thirtyDaysAgo,
  }).catch(() => ({ data: null }))

  // Clicks by source (30d)
  const { data: bySource } = await supabase.rpc('click_counts_by_source', {
    since: thirtyDaysAgo,
  }).catch(() => ({ data: null }))

  // If RPCs don't exist yet, fall back to raw queries
  let supplierClicks = bySupplier
  let sourceClicks = bySource

  if (!supplierClicks) {
    const { data } = await supabase
      .from('click_events')
      .select('supplier_id')
      .gte('created_at', thirtyDaysAgo)

    if (data) {
      const counts: Record<string, number> = {}
      for (const row of data) {
        const id = row.supplier_id || 'unknown'
        counts[id] = (counts[id] || 0) + 1
      }
      supplierClicks = Object.entries(counts)
        .map(([supplier_id, clicks]) => ({ supplier_id, clicks }))
        .sort((a, b) => b.clicks - a.clicks)
    }
  }

  if (!sourceClicks) {
    const { data } = await supabase
      .from('click_events')
      .select('source')
      .gte('created_at', thirtyDaysAgo)

    if (data) {
      const counts: Record<string, number> = {}
      for (const row of data) {
        const src = (row as any).source || 'unknown'
        counts[src] = (counts[src] || 0) + 1
      }
      sourceClicks = Object.entries(counts)
        .map(([source, clicks]) => ({ source, clicks }))
        .sort((a, b) => b.clicks - a.clicks)
    }
  }

  // Resolve supplier names
  if (supplierClicks && supplierClicks.length > 0) {
    const ids = supplierClicks.map((s: any) => s.supplier_id).filter((id: string) => id !== 'unknown')
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name')
      .in('id', ids)

    const nameMap = new Map((suppliers || []).map((s) => [s.id, s.name]))
    supplierClicks = supplierClicks.map((s: any) => ({
      ...s,
      supplier_name: nameMap.get(s.supplier_id) || s.supplier_id,
    }))
  }

  return NextResponse.json({
    total: { last_7d: total7d || 0, last_30d: total30d || 0 },
    by_supplier_30d: supplierClicks || [],
    by_source_30d: sourceClicks || [],
    generated_at: now.toISOString(),
  })
}
