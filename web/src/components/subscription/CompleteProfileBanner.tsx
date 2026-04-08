'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CompleteProfileBanner({ userEmail }: { userEmail: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    rut: '',
    professional_address: '',
    whatsapp_number: '',
  })

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

    setLoading(true)
    const res = await fetch('/api/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Error al guardar')
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
    router.refresh()
  }

  if (submitted) return null

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'

  return (
    <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-6 mb-8">
      <div className="flex items-start gap-3 mb-4">
        <svg className="w-6 h-6 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
        <div>
          <h3 className="font-semibold text-foreground">Completa tu perfil</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Para activar tu suscripción gratuita y recibir alertas, necesitamos algunos datos
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cp_first_name" className="block text-sm font-medium text-foreground mb-1">
              Nombre <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <input
              id="cp_first_name"
              type="text"
              required
              className={inputClass}
              placeholder="Juan"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="cp_last_name" className="block text-sm font-medium text-foreground mb-1">
              Apellido <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <input
              id="cp_last_name"
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
          <label htmlFor="cp_email" className="block text-sm font-medium text-foreground mb-1">
            Email
          </label>
          <input
            id="cp_email"
            type="email"
            disabled
            className={`${inputClass} bg-muted cursor-not-allowed`}
            value={userEmail}
          />
        </div>

        <div>
          <label htmlFor="cp_rut" className="block text-sm font-medium text-foreground mb-1">
            RUT <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <input
            id="cp_rut"
            type="text"
            required
            className={inputClass}
            placeholder="12.345.678-9"
            value={form.rut}
            onChange={(e) => setForm({ ...form, rut: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="cp_address" className="block text-sm font-medium text-foreground mb-1">
            Dirección profesional <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <input
            id="cp_address"
            type="text"
            required
            className={inputClass}
            placeholder="Av. Providencia 1234, Of. 56, Santiago"
            value={form.professional_address}
            onChange={(e) => setForm({ ...form, professional_address: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="cp_whatsapp" className="block text-sm font-medium text-foreground mb-1">
            WhatsApp <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="cp_whatsapp"
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
          <p role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Completar perfil y suscribirme gratis'}
        </button>
      </form>
    </div>
  )
}
