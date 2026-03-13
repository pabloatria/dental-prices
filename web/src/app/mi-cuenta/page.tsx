import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCLP } from '@/lib/queries/products'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/ingresar')

  const { data: favorites } = await supabase
    .from('favorites')
    .select('*, product:products(*)')
    .eq('user_id', user.id)

  const { data: alerts } = await supabase
    .from('price_alerts')
    .select('*, product:products(*)')
    .eq('user_id', user.id)
    .eq('active', true)

  const { data: subscription } = await supabase
    .from('subscribers')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  const { data: stockAlerts } = await supabase
    .from('stock_alerts')
    .select('*, product:products(*), supplier:suppliers(id, name)')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Mi cuenta</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground">Mi cuenta</h1>
        <span className="text-sm text-muted-foreground">{user.email}</span>
      </div>

      {/* Subscription status */}
      <div className="bg-card rounded-xl border border-border p-4 mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {subscription ? 'Plan Gratis activo' : 'Sin suscripción'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subscription ? '2 alertas de stock incluidas' : 'Suscríbete para recibir alertas de stock'}
          </p>
        </div>
        <Link
          href="/suscripcion"
          className="text-sm text-primary hover:underline"
        >
          {subscription ? 'Ver planes' : 'Suscribirse'}
        </Link>
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">Mis favoritos</h2>
        {favorites && favorites.length > 0 ? (
          <div className="space-y-3">
            {favorites.map((fav: any) => (
              <Link
                key={fav.id}
                href={`/producto/${fav.product.id}`}
                className="block bg-card p-4 rounded-xl border border-border hover:border-primary/20 hover:shadow-md transition-all"
              >
                <span className="font-medium text-foreground">{fav.product.name}</span>
                {fav.product.brand && (
                  <span className="text-sm text-muted-foreground ml-2">{fav.product.brand}</span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <svg className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
            <p className="text-muted-foreground">Aún no tienes productos favoritos</p>
            <Link href="/categorias" className="text-sm text-primary hover:underline mt-2 inline-block">
              Explorar productos
            </Link>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Mis alertas de precio</h2>
        {alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert: any) => (
              <div key={alert.id} className="bg-card p-4 rounded-xl border border-border">
                <Link href={`/producto/${alert.product.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                  {alert.product.name}
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  Alerta cuando el precio baje de {formatCLP(alert.target_price)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <svg className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <p className="text-muted-foreground">No tienes alertas de precio activas</p>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">Mis alertas de stock</h2>
        {stockAlerts && stockAlerts.length > 0 ? (
          <div className="space-y-3">
            {stockAlerts.map((alert: any) => (
              <div key={alert.id} className="bg-card p-4 rounded-xl border border-border">
                <Link href={`/producto/${alert.product.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                  {alert.product.name}
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  Esperando stock en {alert.supplier.name}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <svg className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <p className="text-muted-foreground">No tienes alertas de stock activas</p>
          </div>
        )}
      </section>
    </div>
  )
}
