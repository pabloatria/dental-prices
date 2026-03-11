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

    // High DPI support
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const paddingLeft = 70
    const paddingRight = 20
    const paddingTop = 20
    const paddingBottom = 40

    ctx.clearRect(0, 0, width, height)

    const prices = priceHistory.map((p) => p.price)
    const minPrice = Math.min(...prices) * 0.95
    const maxPrice = Math.max(...prices) * 1.05
    const dataPoints = priceHistory.length

    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom

    const xScale = dataPoints > 1 ? chartWidth / (dataPoints - 1) : chartWidth
    const yScale = (maxPrice - minPrice) > 0 ? chartHeight / (maxPrice - minPrice) : 1

    const getX = (i: number) => paddingLeft + i * xScale
    const getY = (price: number) => paddingTop + chartHeight - (price - minPrice) * yScale

    // Grid lines
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 0.5
    const gridLines = 4
    for (let i = 0; i <= gridLines; i++) {
      const y = paddingTop + (chartHeight / gridLines) * i
      ctx.beginPath()
      ctx.moveTo(paddingLeft, y)
      ctx.lineTo(width - paddingRight, y)
      ctx.stroke()

      // Y-axis labels
      const priceVal = maxPrice - ((maxPrice - minPrice) / gridLines) * i
      ctx.fillStyle = '#9ca3af'
      ctx.font = '11px system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`$${Math.round(priceVal).toLocaleString('es-CL')}`, paddingLeft - 8, y + 4)
    }

    // X-axis labels
    ctx.fillStyle = '#9ca3af'
    ctx.font = '10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    const labelInterval = Math.max(1, Math.floor(dataPoints / 6))
    priceHistory.forEach((point, i) => {
      if (i % labelInterval === 0 || i === dataPoints - 1) {
        const x = getX(i)
        const date = new Date(point.date)
        const label = `${date.getDate()}/${date.getMonth() + 1}`
        ctx.fillText(label, x, height - 8)
      }
    })

    // Gradient fill under line
    const gradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight)
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.15)')
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)')

    ctx.beginPath()
    ctx.moveTo(getX(0), getY(priceHistory[0].price))
    priceHistory.forEach((point, i) => {
      if (i > 0) ctx.lineTo(getX(i), getY(point.price))
    })
    ctx.lineTo(getX(dataPoints - 1), paddingTop + chartHeight)
    ctx.lineTo(getX(0), paddingTop + chartHeight)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Line
    ctx.beginPath()
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    priceHistory.forEach((point, i) => {
      const x = getX(i)
      const y = getY(point.price)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Dots
    priceHistory.forEach((point, i) => {
      const x = getX(i)
      const y = getY(point.price)

      // Outer ring
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#2563eb'
      ctx.lineWidth = 2
      ctx.stroke()

      // Inner dot
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#2563eb'
      ctx.fill()
    })
  }, [priceHistory])

  if (priceHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-accent/30 rounded-lg">
        <p className="text-sm text-muted-foreground">Sin historial de precios disponible</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: '220px' }}
      />
    </div>
  )
}
