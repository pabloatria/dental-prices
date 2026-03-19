'use client'

import { useEffect } from 'react'
import { trackProductView } from '@/lib/analytics'

export default function TrackProductView({
  productId,
  productName,
  brand,
}: {
  productId: string
  productName: string
  brand?: string
}) {
  useEffect(() => {
    trackProductView(productId, productName, brand)
  }, [productId, productName, brand])

  return null
}
