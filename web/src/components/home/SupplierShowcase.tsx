import type { Supplier } from '@/lib/types'

export default function SupplierShowcase({ suppliers }: { suppliers: Supplier[] }) {
  if (suppliers.length === 0) return null

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-lg font-semibold text-center text-muted-foreground mb-6">
          Comparamos precios de los principales proveedores
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="px-5 py-2.5 bg-card border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/20 transition-colors"
            >
              {supplier.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
