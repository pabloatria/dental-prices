'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AddToCartButtonProps {
  productId: string
  supplierId: string
  price: number
}

export default function AddToCartButton({ productId, supplierId, price }: AddToCartButtonProps) {
  const [inCart, setInCart] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('cart_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('supplier_id', supplierId)
        .maybeSingle()

      setInCart(!!data)
    }
    check()
  }, [productId, supplierId])

  const addToCart = async () => {
    if (!userId) {
      if (window.confirm('Para usar el carrito necesitas una cuenta. ¿Ir a crear cuenta?')) {
        window.location.href = '/ingresar'
      }
      return
    }

    setLoading(true)
    const supabase = createClient()

    if (inCart) {
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId)
        .eq('supplier_id', supplierId)
      setInCart(false)
    } else {
      await supabase
        .from('cart_items')
        .upsert({
          user_id: userId,
          product_id: productId,
          supplier_id: supplierId,
          price_snapshot: price,
        }, { onConflict: 'user_id,product_id,supplier_id' })
      setInCart(true)
    }
    window.dispatchEvent(new Event('cart-updated'))
    setLoading(false)
  }

  return (
    <button
      onClick={addToCart}
      disabled={loading}
      title={inCart ? 'Quitar del carrito' : 'Agregar al carrito'}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-sm transition-colors disabled:opacity-50 ${
        inCart
          ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
          : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      <svg className="w-4 h-4" fill={inCart ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    </button>
  )
}
