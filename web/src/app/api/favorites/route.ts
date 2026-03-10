import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await supabase
    .from('favorites')
    .select('*, product:products(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return Response.json({ favorites: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { product_id } = await request.json()
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: user.id, product_id })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { product_id } = await request.json()
  await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', product_id)

  return Response.json({ success: true })
}
