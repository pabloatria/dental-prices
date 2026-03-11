'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCLP } from '@/lib/queries/products'

export default function PriceAlertButton({
  productId,
  currentLowest,
}: {
  productId: string
  currentLowest: number
}) {
  const [hasAlert, setHasAlert] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [targetPrice, setTargetPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const checkAlert = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const { data } = await supabase
        .from('price_alerts')
        .select('id, target_price')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('active', true)
        .maybeSingle()

      if (data) {
        setHasAlert(true)
        setTargetPrice(String(data.target_price))
      }
    }
    checkAlert()
  }, [productId])

  const createAlert = async () => {
    if (!userId) {
      window.location.href = '/ingresar'
      return
    }

    const price = parseInt(targetPrice)
    if (isNaN(price) || price <= 0) return

    setLoading(true)
    const supabase = createClient()

    await supabase.from('price_alerts').insert({
      user_id: userId,
      product_id: productId,
      target_price: price,
      active: true,
    })

    setHasAlert(true)
    setShowForm(false)
    setLoading(false)
  }

  const removeAlert = async () => {
    if (!userId) return
    setLoading(true)
    const supabase = createClient()

    await supabase
      .from('price_alerts')
      .update({ active: false })
      .eq('user_id', userId)
      .eq('product_id', productId)

    setHasAlert(false)
    setLoading(false)
  }

  if (hasAlert) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          Alerta activa: {formatCLP(parseInt(targetPrice))}
        </span>
        <button
          onClick={removeAlert}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Eliminar
        </button>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          placeholder={`Ej: ${Math.round(currentLowest * 0.9)}`}
          className="w-32 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={createAlert}
          disabled={loading}
          className="px-3 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Crear
        </button>
        <button
          onClick={() => setShowForm(false)}
          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        if (!userId) {
          window.location.href = '/ingresar'
          return
        }
        setTargetPrice(String(Math.round(currentLowest * 0.9)))
        setShowForm(true)
      }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
      Alerta de precio
    </button>
  )
}
