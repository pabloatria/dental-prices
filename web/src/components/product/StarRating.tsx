'use client'

import { useState, useEffect } from 'react'

export default function StarRating({ productId }: { productId: string }) {
  const [average, setAverage] = useState(0)
  const [count, setCount] = useState(0)
  const [userRating, setUserRating] = useState<number | null>(null)
  const [hovering, setHovering] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/ratings?product_id=${productId}`)
      .then((r) => r.json())
      .then((data) => {
        setAverage(data.average)
        setCount(data.count)
        setUserRating(data.userRating)
      })
  }, [productId])

  const handleRate = async (rating: number) => {
    setLoading(true)
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, rating }),
    })

    if (res.status === 401) {
      window.location.href = '/ingresar'
      return
    }

    if (res.ok) {
      setUserRating(rating)
      // Recalculate displayed average
      const newCount = userRating ? count : count + 1
      const oldSum = average * count
      const newSum = userRating
        ? oldSum - userRating + rating
        : oldSum + rating
      setAverage(Math.round((newSum / newCount) * 10) / 10)
      setCount(newCount)
    }
    setLoading(false)
  }

  const displayRating = hovering || userRating || 0

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-0.5" onMouseLeave={() => setHovering(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={loading}
            className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
            onMouseEnter={() => setHovering(star)}
            onClick={() => handleRate(star)}
            aria-label={`Calificar ${star} estrella${star > 1 ? 's' : ''}`}
          >
            <svg
              className={`w-5 h-5 ${
                star <= displayRating
                  ? 'text-yellow-400 fill-yellow-400'
                  : star <= Math.round(average)
                    ? 'text-yellow-400/40 fill-yellow-400/40'
                    : 'text-muted-foreground/30 fill-muted-foreground/30'
              }`}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      {count > 0 && (
        <span className="text-sm text-muted-foreground">
          {average} ({count} {count === 1 ? 'voto' : 'votos'})
        </span>
      )}
      {count === 0 && (
        <span className="text-sm text-muted-foreground">Sé el primero en calificar</span>
      )}
    </div>
  )
}
