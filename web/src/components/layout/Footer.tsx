import Link from 'next/link'
import type { Category } from '@/lib/types'

export default function Footer({ categories }: { categories: Category[] }) {
  return (
    <footer className="bg-foreground text-background/80 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3c-3 0-5.5 2-6.5 5-1 3 0 7 1 10 1.5 4 3 8 4.5 9 .5.5 1.5.5 2 0 1-1.5 1.5-4 2-7 .5 3 1 5.5 2 7 .5.5 1.5.5 2 0 1.5-1 3-5 4.5-9 1-3 2-7 1-10C23.5 5 21 3 12 3z"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-background">DentalPrecios</span>
            </div>
            <p className="text-sm text-background/60 leading-relaxed">
              Compara precios de productos dentales en Chile. Encuentra el mejor precio de todas las tiendas dentales del pa&iacute;s.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-background mb-4">Categor&iacute;as</h3>
            <ul className="space-y-2">
              {categories.slice(0, 8).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/categorias/${cat.slug}`}
                    className="text-sm text-background/60 hover:text-background transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-background mb-4">Navegaci&oacute;n</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/buscar" className="text-sm text-background/60 hover:text-background transition-colors">
                  Buscar productos
                </Link>
              </li>
              <li>
                <Link href="/categorias" className="text-sm text-background/60 hover:text-background transition-colors">
                  Todas las categor&iacute;as
                </Link>
              </li>
              <li>
                <Link href="/mi-cuenta" className="text-sm text-background/60 hover:text-background transition-colors">
                  Mi cuenta
                </Link>
              </li>
              <li>
                <Link href="/suscripcion" className="text-sm text-background/60 hover:text-background transition-colors">
                  Suscripción
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold text-background mb-4">Informaci&oacute;n</h3>
            <p className="text-sm text-background/60 leading-relaxed">
              DentalPrecios compara precios de m&uacute;ltiples proveedores dentales en Chile para ayudarte a encontrar la mejor oferta.
            </p>
            <p className="text-sm text-background/60 mt-3">
              Precios actualizados diariamente.
            </p>
          </div>
        </div>

        <div className="border-t border-background/10 mt-8 pt-8 text-center">
          <p className="text-sm text-background/40">
            &copy; {new Date().getFullYear()} DentalPrecios. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
