'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface FilterPanelProps {
  brands: string[]
  suppliers: { id: string; name: string }[]
  activeFilters: {
    brands: string[]
    suppliers: string[]
    inStock: boolean
    sort: string
  }
  basePath: string
  baseQuery?: string
  categorySlug?: string
}

export default function FilterPanel({
  brands,
  suppliers,
  activeFilters,
  basePath,
  baseQuery,
  categorySlug,
}: FilterPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = useCallback(
    (key: string, value: string | string[] | boolean) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page') // Reset page on filter change

      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','))
        } else {
          params.delete(key)
        }
      } else if (typeof value === 'boolean') {
        if (value) {
          params.set(key, '1')
        } else {
          params.delete(key)
        }
      } else {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }

      router.push(`${basePath}?${params.toString()}`)
    },
    [router, searchParams, basePath]
  )

  const toggleBrand = (brand: string) => {
    const current = [...activeFilters.brands]
    const idx = current.indexOf(brand)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(brand)
    }
    updateFilter('brand', current)
  }

  const toggleSupplier = (supplierId: string) => {
    const current = [...activeFilters.suppliers]
    const idx = current.indexOf(supplierId)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(supplierId)
    }
    updateFilter('supplier', current)
  }

  const clearFilters = () => {
    const params = new URLSearchParams()
    if (baseQuery) params.set('q', baseQuery)
    router.push(`${basePath}?${params.toString()}`)
  }

  const hasActiveFilters =
    activeFilters.brands.length > 0 ||
    activeFilters.suppliers.length > 0 ||
    activeFilters.inStock

  return (
    <div className="space-y-6">
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="text-sm text-primary hover:underline font-medium"
        >
          Limpiar filtros
        </button>
      )}

      {/* Availability */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Disponibilidad</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={activeFilters.inStock}
            onChange={(e) => updateFilter('in_stock', e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground">Solo disponibles</span>
        </label>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Marca</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {brands.slice(0, 20).map((brand) => (
              <label key={brand} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeFilters.brands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground truncate">{brand}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Suppliers */}
      {suppliers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Proveedor</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {suppliers.map((supplier) => (
              <label key={supplier.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeFilters.suppliers.includes(supplier.id)}
                  onChange={() => toggleSupplier(supplier.id)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground truncate">{supplier.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
