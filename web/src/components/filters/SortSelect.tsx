'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { usePathname } from 'next/navigation'

const SORT_OPTIONS = [
  { value: 'name', label: 'Nombre A-Z' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'stores', label: 'M\u00E1s tiendas' },
]

export default function SortSelect() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentSort = searchParams.get('sort') || 'name'

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', e.target.value)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={currentSort}
      onChange={handleChange}
      className="text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
