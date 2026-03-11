'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function FavoriteButton({ productId }: { productId: string }) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const checkFavorite = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle()

      setIsFavorite(!!data)
    }
    checkFavorite()
  }, [productId])

  const toggleFavorite = async () => {
    if (!userId) {
      window.location.href = '/ingresar'
      return
    }

    setLoading(true)
    const supabase = createClient()

    if (isFavorite) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId)
      setIsFavorite(false)
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: userId, product_id: productId })
      setIsFavorite(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${
        isFavorite
          ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
          : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      <svg
        className="w-4 h-4"
        fill={isFavorite ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        />
      </svg>
      {isFavorite ? 'Favorito' : 'Guardar'}
    </button>
  )
}
