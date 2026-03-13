import { createClient } from '@/lib/supabase/server'

const FREE_ALERT_LIMIT = 2

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await supabase
    .from('stock_alerts')
    .select('*, product:products(*), supplier:suppliers(id, name)')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  return Response.json({ alerts: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  // Check subscriber status
  const { data: sub } = await supabase
    .from('subscribers')
    .select('id, plan')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (!sub) {
    return Response.json({ error: 'Debes suscribirte para crear alertas de stock' }, { status: 403 })
  }

  // Enforce free tier limit
  if (sub.plan === 'free') {
    const { count } = await supabase
      .from('stock_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('active', true)

    if ((count ?? 0) >= FREE_ALERT_LIMIT) {
      return Response.json({
        error: `Límite de ${FREE_ALERT_LIMIT} alertas alcanzado. Actualiza a Premium para más.`,
        limit_reached: true,
      }, { status: 403 })
    }
  }

  const { product_id, supplier_id } = await request.json()
  const { error } = await supabase
    .from('stock_alerts')
    .insert({ user_id: user.id, product_id, supplier_id })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { product_id, supplier_id } = await request.json()
  await supabase
    .from('stock_alerts')
    .update({ active: false })
    .eq('user_id', user.id)
    .eq('product_id', product_id)
    .eq('supplier_id', supplier_id)

  return Response.json({ success: true })
}
