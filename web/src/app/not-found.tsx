import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-foreground mb-2">Página no encontrada</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Este producto o categoría ya no está disponible. Puede haber sido actualizado o eliminado.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/buscar"
          className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          Buscar productos
        </Link>
        <Link
          href="/categorias"
          className="border border-border px-6 py-3 rounded-xl font-medium hover:bg-muted transition-colors"
        >
          Ver categorías
        </Link>
      </div>
    </div>
  )
}
