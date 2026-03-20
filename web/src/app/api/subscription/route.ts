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

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { first_name, last_name, rut, professional_address, whatsapp_number } = body

  // Validate required fields
  if (!first_name?.trim() || !last_name?.trim()) {
    return Response.json({ error: 'Nombre y apellido son obligatorios' }, { status: 400 })
  }
  if (!rut?.trim()) {
    return Response.json({ error: 'El RUT es obligatorio' }, { status: 400 })
  }
  if (!professional_address?.trim()) {
    return Response.json({ error: 'La dirección profesional es obligatoria' }, { status: 400 })
  }

  const profileData = {
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    rut: rut.trim(),
    professional_address: professional_address.trim(),
    whatsapp_number: whatsapp_number?.trim() || null,
  }

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
      .update({
        active: true,
        subscribed_at: new Date().toISOString(),
        ...profileData,
      })
      .eq('id', inactive.id)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  }

  const { error } = await supabase
    .from('subscribers')
    .insert({
      user_id: user.id,
      plan: 'free',
      ...profileData,
    })

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
