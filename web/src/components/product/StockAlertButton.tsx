'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function StockAlertButton({
  productId,
  supplierId,
  supplierName,
}: {
  productId: string
  supplierId: string
  supplierName: string
}) {
  const [hasAlert, setHasAlert] = useState(false)
  const [isSubscriber, setIsSubscriber] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      // Check subscription
      const { data: sub } = await supabase
        .from('subscribers')
        .select('id, plan')
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle()

      if (sub) setIsSubscriber(true)

      // Check existing alert
      const { data: alert } = await supabase
        .from('stock_alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('supplier_id', supplierId)
        .eq('active', true)
        .maybeSingle()

      if (alert) setHasAlert(true)

      // Check limit (free tier = 2)
      if (sub?.plan === 'free' && !alert) {
        const { count } = await supabase
          .from('stock_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('active', true)

        if ((count ?? 0) >= 2) setLimitReached(true)
      }
    }
    check()
  }, [productId, supplierId])

  const createAlert = async () => {
    if (!userId) {
      window.location.href = '/ingresar'
      return
    }
    if (!isSubscriber) {
      window.location.href = '/suscripcion'
      return
    }

    setLoading(true)
    const res = await fetch('/api/stock-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, supplier_id: supplierId }),
    })

    const data = await res.json()
    if (data.limit_reached) {
      setLimitReached(true)
    } else if (data.success) {
      setHasAlert(true)
    }
    setLoading(false)
  }

  const removeAlert = async () => {
    setLoading(true)
    await fetch('/api/stock-alerts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, supplier_id: supplierId }),
    })
    setHasAlert(false)
    setLimitReached(false)
    setLoading(false)
  }

  if (hasAlert) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/5 border border-primary/20 rounded text-xs text-primary">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          Te avisaremos
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

  if (limitReached) {
    return (
      <span className="text-xs text-muted-foreground" title="Actualiza a Premium para más alertas">
        Límite alcanzado
      </span>
    )
  }

  return (
    <button
      onClick={createAlert}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
      {isSubscriber ? 'Avisarme' : 'Suscríbete'}
    </button>
  )
}
