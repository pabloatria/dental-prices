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
      // nofollow: /api/redirect is already noindex+nofollow via x-robots-tag,
      // but the links are followed by Googlebot until they hit that header.
      // rel=nofollow here prevents Google from crawling the redirect endpoint
      // at all — saves crawl budget that would be wasted on 1000+ unique
      // /api/redirect?product=X&supplier=Y URLs per product page.
      // sponsored: these are affiliate-style outbound clicks to suppliers.
      rel="noopener noreferrer nofollow sponsored"
      className={className}
      onClick={() => {
        trackSupplierClick(productId, supplierId, supplierName, price)
      }}
    >
      {children}
    </a>
  )
}
