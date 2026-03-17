import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DentalPrecios — Comparador de precios dentales',
    short_name: 'DentalPrecios',
    description: 'Compara precios de productos dentales en Chile',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#2563eb',
    icons: [
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { src: '/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
