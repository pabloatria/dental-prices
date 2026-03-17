import Link from 'next/link'
import Image from 'next/image'
import type { Category } from '@/lib/types'

export default function Footer({ categories }: { categories: Category[] }) {
  return (
    <footer className="bg-foreground text-background/80 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/logo-icon.png"
                alt="DentalPrecios"
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg"
              />
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
              {categories.slice(0, 12).map((cat) => (
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
              <li>
                <Link href="/blog" className="text-sm text-background/60 hover:text-background transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold text-background mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacidad" className="text-sm text-background/60 hover:text-background transition-colors">
                  Pol&iacute;tica de Privacidad
                </Link>
              </li>
            </ul>
            <p className="text-sm text-background/60 leading-relaxed mt-4">
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
