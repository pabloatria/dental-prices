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

  // ?include_bots=true to see bot data, defaults to human-only
  const includeBots = request.nextUrl.searchParams.get('include_bots') === 'true'

  const baseQuery = (table: string) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true })
    if (!includeBots) q = q.eq('is_bot', false)
    return q
  }

  // Total clicks 7d and 30d
  const { count: total7d } = await supabase
    .from('click_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo)
    .eq('is_bot', includeBots ? undefined as any : false)

  const { count: total30d } = await supabase
    .from('click_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo)
    .eq('is_bot', includeBots ? undefined as any : false)

  // Clicks by supplier (30d)
  const supplierQuery = supabase
    .from('click_events')
    .select('supplier_id')
    .gte('created_at', thirtyDaysAgo)
  if (!includeBots) supplierQuery.eq('is_bot', false)
  const { data: supplierData } = await supplierQuery

  let supplierClicks: any[] = []
  if (supplierData) {
    const counts: Record<string, number> = {}
    for (const row of supplierData) {
      const id = row.supplier_id || 'unknown'
      counts[id] = (counts[id] || 0) + 1
    }
    supplierClicks = Object.entries(counts)
      .map(([supplier_id, clicks]) => ({ supplier_id, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
  }

  // Clicks by source (30d)
  const sourceQuery = supabase
    .from('click_events')
    .select('source')
    .gte('created_at', thirtyDaysAgo)
  if (!includeBots) sourceQuery.eq('is_bot', false)
  const { data: sourceData } = await sourceQuery

  let sourceClicks: any[] = []
  if (sourceData) {
    const counts: Record<string, number> = {}
    for (const row of sourceData) {
      const src = (row as any).source || 'unknown'
      counts[src] = (counts[src] || 0) + 1
    }
    sourceClicks = Object.entries(counts)
      .map(([source, clicks]) => ({ source, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
  }

  // Bot summary (always included for GEO tracking)
  const { data: botData } = await supabase
    .from('click_events')
    .select('user_agent')
    .gte('created_at', thirtyDaysAgo)
    .eq('is_bot', true)

  const botCounts: Record<string, number> = {}
  if (botData) {
    for (const row of botData) {
      const ua = row.user_agent || 'unknown'
      const botName = ua.match(/GPTBot|Googlebot|Bingbot|ClaudeBot|PerplexityBot|YandexBot|Applebot|Bytespider/i)?.[0] || 'other'
      botCounts[botName] = (botCounts[botName] || 0) + 1
    }
  }
  const botSummary = Object.entries(botCounts)
    .map(([bot, clicks]) => ({ bot, clicks }))
    .sort((a, b) => b.clicks - a.clicks)

  // Resolve supplier names
  if (supplierClicks.length > 0) {
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
    filter: includeBots ? 'all' : 'humans_only',
    total: { last_7d: total7d || 0, last_30d: total30d || 0 },
    by_supplier_30d: supplierClicks,
    by_source_30d: sourceClicks,
    bot_activity_30d: botSummary,
    generated_at: now.toISOString(),
  })
}
