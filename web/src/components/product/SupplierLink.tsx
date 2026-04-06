'use client'

import { trackSupplierClick } from '@/lib/analytics'

interface SupplierLinkProps {
  productUrl: string
  productId: string
  supplierId: string
  supplierName: string
  price: number
  source: string
  className?: string
  children: React.ReactNode
}

export default function SupplierLink({
  productUrl,
  productId,
  supplierId,
  supplierName,
  price,
  source,
  className,
  children,
}: SupplierLinkProps) {
  const redirectUrl = `/api/redirect?url=${encodeURIComponent(productUrl)}&product=${productId}&supplier=${supplierId}&source=${source}`

  return (
    <a
      href={redirectUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => {
        trackSupplierClick(productId, supplierId, supplierName, price)
      }}
    >
      {children}
    </a>
  )
}
