'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackSubscriptionClick } from '@/lib/analytics'

export default function SubscribeForm({
  isLoggedIn,
  isSubscribed,
  userEmail,
}: {
  isLoggedIn: boolean
  isSubscribed: boolean
  userEmail?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    rut: '',
    professional_address: '',
    whatsapp_number: '',
  })

  if (isSubscribed) {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-lg text-sm font-medium border border-primary/20">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          Suscripción activa
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="text-center">
        <a
          href="/ingresar"
          className="inline-block w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-center"
        >
          Ingresar para suscribirse
        </a>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('Nombre y apellido son obligatorios')
      return
    }
    if (!form.rut.trim()) {
      setError('El RUT es obligatorio')
      return
    }
    if (!form.professional_address.trim()) {
      setError('La dirección profesional es obligatoria')
      return
    }

    trackSubscriptionClick('subscribe_form')
    setLoading(true)

    const res = await fetch('/api/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Error al suscribirse')
      setLoading(false)
      return
    }

    router.refresh()
    setLoading(false)
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-foreground mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            id="first_name"
            type="text"
            required
            className={inputClass}
            placeholder="Juan"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-foreground mb-1">
            Apellido <span className="text-red-500">*</span>
          </label>
          <input
            id="last_name"
            type="text"
            required
            className={inputClass}
            placeholder="Pérez"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          disabled
          className={`${inputClass} bg-muted cursor-not-allowed`}
          value={userEmail || ''}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Asociado a tu cuenta, no se puede modificar aquí
        </p>
      </div>

      <div>
        <label htmlFor="rut" className="block text-sm font-medium text-foreground mb-1">
          RUT <span className="text-red-500">*</span>
        </label>
        <input
          id="rut"
          type="text"
          required
          className={inputClass}
          placeholder="12.345.678-9"
          value={form.rut}
          onChange={(e) => setForm({ ...form, rut: e.target.value })}
        />
      </div>

      <div>
        <label htmlFor="professional_address" className="block text-sm font-medium text-foreground mb-1">
          Dirección profesional <span className="text-red-500">*</span>
        </label>
        <input
          id="professional_address"
          type="text"
          required
          className={inputClass}
          placeholder="Av. Providencia 1234, Of. 56, Santiago"
          value={form.professional_address}
          onChange={(e) => setForm({ ...form, professional_address: e.target.value })}
        />
      </div>

      <div>
        <label htmlFor="whatsapp" className="block text-sm font-medium text-foreground mb-1">
          WhatsApp <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="whatsapp"
          type="tel"
          className={inputClass}
          placeholder="+56 9 1234 5678"
          value={form.whatsapp_number}
          onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Si deseas recibir notificaciones por WhatsApp en el futuro, necesitaremos este dato
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Suscribiendo...' : 'Suscribirse gratis'}
      </button>
    </form>
  )
}
