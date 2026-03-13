import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Get unprocessed restock events
  const { data: events } = await supabase
    .from('restock_events')
    .select('id, product_id, supplier_id')
    .eq('processed', false)
    .order('detected_at', { ascending: true })

  if (!events || events.length === 0) {
    return Response.json({ message: 'No restock events', sent: 0 })
  }

  // 2. For each event, find matching active stock alerts
  const notifications = new Map<string, {
    email: string
    products: { name: string; supplier: string; url: string }[]
    alertIds: string[]
  }>()

  for (const event of events) {
    const { data: alerts } = await supabase
      .from('stock_alerts')
      .select('id, user_id')
      .eq('product_id', event.product_id)
      .eq('supplier_id', event.supplier_id)
      .eq('active', true)

    if (!alerts || alerts.length === 0) continue

    // Get product and supplier info
    const { data: product } = await supabase
      .from('products')
      .select('name, id')
      .eq('id', event.product_id)
      .single()

    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', event.supplier_id)
      .single()

    if (!product || !supplier) continue

    for (const alert of alerts) {
      if (!notifications.has(alert.user_id)) {
        // Get user email
        const { data: { user } } = await supabase.auth.admin.getUserById(alert.user_id)
        if (!user?.email) continue

        notifications.set(alert.user_id, {
          email: user.email,
          products: [],
          alertIds: [],
        })
      }

      const notif = notifications.get(alert.user_id)!
      notif.products.push({
        name: product.name,
        supplier: supplier.name,
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dentalprecios.cl'}/producto/${product.id}`,
      })
      notif.alertIds.push(alert.id)
    }
  }

  // 3. Send one email per user
  let sent = 0
  for (const [, notif] of notifications) {
    const subject = notif.products.length === 1
      ? `"${notif.products[0].name}" volvió a estar disponible`
      : `${notif.products.length} productos volvieron a estar disponibles`

    const productListHtml = notif.products.map((p) => `
      <div style="margin-bottom:16px;padding:12px;background:#f9fafb;border-radius:8px;">
        <p style="margin:0 0 4px;font-weight:600;">${p.name}</p>
        <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Disponible en ${p.supplier}</p>
        <a href="${p.url}" style="display:inline-block;padding:8px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">Ver producto</a>
      </div>
    `).join('')

    try {
      await resend.emails.send({
        from: 'DentalPrecios <alertas@dentalprecios.cl>',
        to: notif.email,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#111;">Buenas noticias</h2>
            <p style="color:#374151;">Los siguientes productos volvieron a estar disponibles:</p>
            ${productListHtml}
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="color:#9ca3af;font-size:12px;">
              Recibiste este email porque tienes una suscripción activa en DentalPrecios.
            </p>
          </div>
        `,
      })
      sent++
    } catch (e) {
      console.error(`Failed to send to ${notif.email}:`, e)
    }

    // Deactivate alerts (one-shot)
    await supabase
      .from('stock_alerts')
      .update({ active: false, notified_at: new Date().toISOString() })
      .in('id', notif.alertIds)
  }

  // 4. Mark all events as processed
  const eventIds = events.map((e) => e.id)
  await supabase
    .from('restock_events')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .in('id', eventIds)

  return Response.json({ message: 'OK', events: events.length, sent })
}
