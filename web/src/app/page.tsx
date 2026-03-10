import SearchBar from '@/components/SearchBar'
import CategoryGrid from '@/components/CategoryGrid'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">DentalPrecios</h1>
          <a href="/ingresar" className="text-sm text-gray-600 hover:text-blue-600">
            Iniciar sesión
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Compara precios de productos dentales en Chile
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Encuentra el mejor precio comparando todas las tiendas dentales del país
        </p>
        <SearchBar />
      </section>

      {/* Categories */}
      <section className="py-12 px-4">
        <h3 className="text-2xl font-semibold text-center text-gray-800 mb-8">
          Categorías populares
        </h3>
        <CategoryGrid />
      </section>
    </main>
  )
}
