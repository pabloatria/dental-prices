import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
}

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

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-blue-600">DentalPrecios</a>
          <span className="text-sm text-gray-600">{user.email}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mi cuenta</h1>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Mis favoritos</h2>
          {favorites && favorites.length > 0 ? (
            <div className="space-y-3">
              {favorites.map((fav: any) => (
                <Link
                  key={fav.id}
                  href={`/producto/${fav.product.id}`}
                  className="block bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition"
                >
                  <span className="font-medium">{fav.product.name}</span>
                  {fav.product.brand && (
                    <span className="text-sm text-gray-500 ml-2">{fav.product.brand}</span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">Aun no tienes productos favoritos</p>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Mis alertas de precio</h2>
          {alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="bg-white p-4 rounded-lg shadow-sm">
                  <Link href={`/producto/${alert.product.id}`} className="font-medium hover:text-blue-600">
                    {alert.product.name}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    Alerta cuando el precio baje de {formatCLP(alert.target_price)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No tienes alertas de precio activas</p>
          )}
        </section>
      </div>
    </main>
  )
}
