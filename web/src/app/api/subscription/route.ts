import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await supabase
    .from('subscribers')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  return Response.json({ subscription: data })
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  // Check if already subscribed (active)
  const { data: existing } = await supabase
    .from('subscribers')
    .select('id')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (existing) return Response.json({ success: true, already: true })

  // Check for inactive row (previously unsubscribed) — reactivate it
  const { data: inactive } = await supabase
    .from('subscribers')
    .select('id')
    .eq('user_id', user.id)
    .eq('active', false)
    .maybeSingle()

  if (inactive) {
    const { error } = await supabase
      .from('subscribers')
      .update({ active: true, subscribed_at: new Date().toISOString() })
      .eq('id', inactive.id)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  }

  const { error } = await supabase
    .from('subscribers')
    .insert({ user_id: user.id, plan: 'free' })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  await supabase
    .from('subscribers')
    .update({ active: false })
    .eq('user_id', user.id)

  return Response.json({ success: true })
}
