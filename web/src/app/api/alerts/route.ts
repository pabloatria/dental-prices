import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await supabase
    .from('price_alerts')
    .select('*, product:products(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return Response.json({ alerts: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { product_id, target_price } = await request.json()
  const { error } = await supabase
    .from('price_alerts')
    .insert({ user_id: user.id, product_id, target_price })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}
