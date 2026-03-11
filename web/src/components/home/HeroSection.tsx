import SearchWithAutocomplete from '@/components/search/SearchWithAutocomplete'

interface HeroSectionProps {
  productCount: number
  supplierCount: number
}

export default function HeroSection({ productCount, supplierCount }: HeroSectionProps) {
  return (
    <section className="relative bg-gradient-to-br from-primary/5 via-background to-primary/10 py-16 sm:py-24 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight">
          Compara precios de productos dentales en Chile
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Encuentra el mejor precio comparando todas las tiendas dentales del pa&iacute;s en un solo lugar
        </p>

        <div className="mt-8 max-w-xl mx-auto">
          <SearchWithAutocomplete />
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 sm:gap-10">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-primary">
              {productCount > 0 ? `${Math.floor(productCount / 100) * 100}+` : '7.800+'}
            </p>
            <p className="text-sm text-muted-foreground">Productos</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-primary">
              {supplierCount > 0 ? `${supplierCount}` : '15'}
            </p>
            <p className="text-sm text-muted-foreground">Proveedores</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-primary">Diario</p>
            <p className="text-sm text-muted-foreground">Actualizado</p>
          </div>
        </div>
      </div>
    </section>
  )
}
