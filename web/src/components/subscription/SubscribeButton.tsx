'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackSubscriptionClick } from '@/lib/analytics'

export default function SubscribeButton({
  isLoggedIn,
  isSubscribed,
}: {
  isLoggedIn: boolean
  isSubscribed: boolean
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (isSubscribed) {
    return (
      <button
        disabled
        className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/20 cursor-default"
      >
        Suscripción activa
      </button>
    )
  }

  const handleSubscribe = async () => {
    trackSubscriptionClick('subscribe_button')
    if (!isLoggedIn) {
      window.location.href = '/ingresar'
      return
    }

    setLoading(true)
    await fetch('/api/subscription', { method: 'POST' })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
    >
      {loading ? 'Suscribiendo...' : 'Suscribirse gratis'}
    </button>
  )
}
