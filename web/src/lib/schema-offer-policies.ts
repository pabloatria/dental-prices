// Shared Offer-policy blocks for Product JSON-LD across the site.
// Required by Google Merchant Listings rich results (hasMerchantReturnPolicy,
// shippingDetails). Values reflect aggregator reality — shipping and return
// policies vary per supplier; these are conservative Chilean-market defaults.

export const OFFER_SHIPPING_DETAILS_CL = {
  '@type': 'OfferShippingDetails',
  shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'CL' },
  shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'CLP' },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 2, unitCode: 'DAY' },
    transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 7, unitCode: 'DAY' },
  },
} as const

export const MERCHANT_RETURN_POLICY_CL = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'CL',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 10,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/ReturnShippingFees',
} as const
