import { getCategoryIcon } from '@/components/icons/CategoryIllustrations'

interface ProductImageProps {
  imageUrl?: string | null
  productName: string
  categorySlug?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-40 h-40',
}

const iconSizeMap = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-20 h-20',
}

export default function ProductImage({
  imageUrl,
  productName,
  categorySlug,
  size = 'md',
  className = '',
}: ProductImageProps) {
  if (imageUrl) {
    return (
      <div className={`${sizeMap[size]} flex-shrink-0 ${className}`}>
        <img
          src={imageUrl}
          alt={productName}
          className="w-full h-full object-contain rounded-lg"
        />
      </div>
    )
  }

  const Icon = getCategoryIcon(categorySlug || '')

  return (
    <div
      className={`${sizeMap[size]} flex-shrink-0 rounded-lg bg-gradient-to-br from-primary/5 to-primary/15 flex items-center justify-center ${className}`}
    >
      <Icon className={`${iconSizeMap[size]} text-primary/40`} />
    </div>
  )
}
