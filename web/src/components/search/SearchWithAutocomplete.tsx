'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackSearch } from '@/lib/analytics'

export default function SearchWithAutocomplete() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>(undefined)
  const abortRef = useRef<AbortController | null>(null)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.products || [])
        setOpen(true)
      }
    } catch {
      // ignore abort and network errors
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }, [])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      trackSearch(query.trim())
      setOpen(false)
      router.push(`/buscar?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleSelect = (productId: string) => {
    setOpen(false)
    router.push(`/producto/${productId}`)
  }

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <label htmlFor="site-search" className="sr-only">Buscar productos dentales</label>
          <svg
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            id="site-search"
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="Buscar productos dentales..."
            className="w-full pl-10 pr-14 sm:pr-20 h-11 bg-secondary border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors h-8 w-10 sm:w-auto sm:px-4 flex items-center justify-center"
          >
            <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.2-5.2M10.5 17a6.5 6.5 0 100-13 6.5 6.5 0 000 13z" />
            </svg>
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {suggestions.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent text-left transition-colors border-b border-border/50 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                {product.brand && (
                  <p className="text-xs text-muted-foreground">{product.brand}</p>
                )}
              </div>
            </button>
          ))}
          <button
            onClick={handleSubmit as any}
            className="w-full px-4 py-2.5 text-sm text-primary font-medium hover:bg-accent transition-colors text-center"
          >
            Ver todos los resultados para &quot;{query}&quot;
          </button>
        </div>
      )}

      {open && loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Buscando...
          </div>
        </div>
      )}
    </div>
  )
}
