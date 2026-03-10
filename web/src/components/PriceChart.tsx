'use client'

import { useEffect, useRef } from 'react'

interface PricePoint {
  date: string
  price: number
  supplier: string
}

export default function PriceChart({ priceHistory }: { priceHistory: PricePoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || priceHistory.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const padding = 40

    ctx.clearRect(0, 0, width, height)

    const prices = priceHistory.map(p => p.price)
    const minPrice = Math.min(...prices) * 0.95
    const maxPrice = Math.max(...prices) * 1.05

    const xScale = (width - padding * 2) / (priceHistory.length - 1 || 1)
    const yScale = (height - padding * 2) / (maxPrice - minPrice || 1)

    // Draw line
    ctx.beginPath()
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2
    priceHistory.forEach((point, i) => {
      const x = padding + i * xScale
      const y = height - padding - (point.price - minPrice) * yScale
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Draw dots
    priceHistory.forEach((point, i) => {
      const x = padding + i * xScale
      const y = height - padding - (point.price - minPrice) * yScale
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#2563eb'
      ctx.fill()
    })
  }, [priceHistory])

  if (priceHistory.length === 0) {
    return <p className="text-sm text-gray-400">Sin historial de precios disponible</p>
  }

  return (
    <canvas ref={canvasRef} width={600} height={200} className="w-full max-w-2xl" />
  )
}
