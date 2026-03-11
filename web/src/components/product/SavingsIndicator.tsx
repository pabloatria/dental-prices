import { formatCLP } from '@/lib/queries/products'

interface SavingsIndicatorProps {
  lowestPrice: number
  highestPrice: number
}

export default function SavingsIndicator({ lowestPrice, highestPrice }: SavingsIndicatorProps) {
  if (lowestPrice <= 0 || highestPrice <= 0 || lowestPrice >= highestPrice) return null

  const savings = highestPrice - lowestPrice
  const percent = Math.round((savings / highestPrice) * 100)

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-full text-sm font-medium">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
      Ahorras hasta {formatCLP(savings)} ({percent}%) comparando
    </div>
  )
}
