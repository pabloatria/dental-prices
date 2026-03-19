declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params)
  }
}

// Key events
export function trackSearch(query: string, resultCount?: number) {
  trackEvent('search', {
    search_term: query,
    results_count: resultCount,
  })
}

export function trackProductView(productId: string, productName: string, brand?: string) {
  trackEvent('view_item', {
    product_id: productId,
    product_name: productName,
    brand: brand || undefined,
  })
}

export function trackSubscriptionClick(source: string) {
  trackEvent('subscription_click', {
    source,
  })
}

export function trackSupplierClick(productId: string, supplierId: string, supplierName: string, price: number) {
  trackEvent('supplier_click', {
    product_id: productId,
    supplier_id: supplierId,
    supplier_name: supplierName,
    price,
  })
}
