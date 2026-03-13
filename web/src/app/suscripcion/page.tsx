import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SubscribeButton from '@/components/subscription/SubscribeButton'

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let subscription = null
  if (user) {
    const { data } = await supabase
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle()
    subscription = data
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Inicio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Suscripción</span>
      </nav>

      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-foreground mb-2">Planes de suscripción</h1>
        <p className="text-muted-foreground">Recibe alertas cuando tus productos favoritos vuelvan a estar disponibles</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Free Tier */}
        <div className={`bg-card rounded-xl border-2 p-6 ${subscription ? 'border-primary' : 'border-border'}`}>
          {subscription && (
            <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-3">
              Tu plan actual
            </span>
          )}
          <h2 className="text-xl font-bold text-foreground">Plan Gratis</h2>
          <p className="text-3xl font-bold text-foreground mt-2">$0<span className="text-sm font-normal text-muted-foreground">/mes</span></p>

          <ul className="mt-6 space-y-3">
            {[
              'Favoritos ilimitados',
              'Alertas de precio ilimitadas',
              '2 alertas de stock',
              'Notificaciones por email',
              'Historial de precios 30 días',
              'Comparador de precios',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <SubscribeButton isLoggedIn={!!user} isSubscribed={!!subscription} />
          </div>
        </div>

        {/* Premium Tier (Coming Soon) */}
        <div className="bg-card rounded-xl border-2 border-border p-6 relative opacity-75">
          <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full mb-3">
            Próximamente
          </span>
          <h2 className="text-xl font-bold text-foreground">Plan Premium</h2>
          <p className="text-3xl font-bold text-foreground mt-2">$3.990<span className="text-sm font-normal text-muted-foreground">/mes</span></p>

          <p className="text-sm text-muted-foreground mt-4 mb-2">Todo lo del plan gratis, más:</p>
          <ul className="space-y-3">
            {[
              'Alertas de stock ilimitadas',
              'Notificaciones por WhatsApp',
              'Alertas de precio por email',
              'Notificaciones prioritarias',
              'Sin publicidad',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <button
              disabled
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-muted text-muted-foreground cursor-not-allowed"
            >
              Próximamente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
