interface DiscountBadgeProps {
  originalPrice: number
  currentPrice: number
  className?: string
}

export default function DiscountBadge({ originalPrice, currentPrice, className = '' }: DiscountBadgeProps) {
  const pct = Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
  if (pct < 10) return null

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white ${className}`}>
      -{pct}%
    </span>
  )
}
