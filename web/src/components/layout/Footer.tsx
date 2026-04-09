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
                <Link href="/ofertas" className="text-sm text-background/60 hover:text-background transition-colors">
                  Ofertas del día
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

          {/* Info + Social */}
          <div>
            <h3 className="font-semibold text-background mb-4">Contacto</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.instagram.com/dentalprecioscl/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-background/60 hover:text-background transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  @dentalprecioscl
                </a>
              </li>
              <li>
                <a
                  href="mailto:contacto@dentalprecios.cl"
                  className="text-sm text-background/60 hover:text-background transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  contacto@dentalprecios.cl
                </a>
              </li>
            </ul>
            <div className="mt-4">
              <h3 className="font-semibold text-background mb-2">Legal</h3>
              <Link href="/privacidad" className="text-sm text-background/60 hover:text-background transition-colors">
                Pol&iacute;tica de Privacidad
              </Link>
            </div>
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
