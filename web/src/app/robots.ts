import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Note: explicit with-slash AND without-slash entries. Google's spec
        // treats `/mi-cuenta/` as matching only URLs *starting with* that
        // prefix — it does NOT match the bare `/mi-cuenta` (no trailing
        // slash). Listing both covers the redirect target.
        disallow: ['/api/', '/mi-cuenta', '/mi-cuenta/', '/ingresar', '/ingresar/', '/mi-carrito', '/mi-carrito/', '/suscripcion', '/suscripcion/'],
      },
      // Explicitly allow search engines (including /_next/ for CSS/JS rendering)
      // Must repeat disallow rules — Google ignores the * group when a Googlebot group exists
      { userAgent: 'Googlebot', allow: ['/', '/_next/'], disallow: ['/api/', '/mi-cuenta', '/mi-cuenta/', '/ingresar', '/ingresar/', '/mi-carrito', '/mi-carrito/', '/suscripcion', '/suscripcion/'] },
      { userAgent: 'Bingbot', allow: ['/', '/_next/'], disallow: ['/api/', '/mi-cuenta', '/mi-cuenta/', '/ingresar', '/ingresar/', '/mi-carrito', '/mi-carrito/', '/suscripcion', '/suscripcion/'] },
      // Allow AI retrieval/citation bots (GEO — appear in AI-generated answers)
      { userAgent: 'GPTBot', allow: '/', disallow: ['/api/', '/mi-cuenta', '/mi-cuenta/', '/ingresar', '/ingresar/', '/mi-carrito', '/mi-carrito/', '/suscripcion', '/suscripcion/'] },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: ['/api/', '/mi-cuenta', '/mi-cuenta/', '/ingresar', '/ingresar/', '/mi-carrito', '/mi-carrito/', '/suscripcion', '/suscripcion/'] },
      { userAgent: 'ClaudeBot', allow: '/', disallow: ['/api/', '/mi-cuenta', '/mi-cuenta/', '/ingresar', '/ingresar/', '/mi-carrito', '/mi-carrito/', '/suscripcion', '/suscripcion/'] },
      { userAgent: 'PerplexityBot', allow: '/', disallow: ['/api/', '/mi-cuenta', '/mi-cuenta/', '/ingresar', '/ingresar/', '/mi-carrito', '/mi-carrito/', '/suscripcion', '/suscripcion/'] },
      { userAgent: 'Google-Extended', allow: '/', disallow: ['/api/', '/mi-cuenta', '/mi-cuenta/', '/ingresar', '/ingresar/', '/mi-carrito', '/mi-carrito/', '/suscripcion', '/suscripcion/'] },
      { userAgent: 'Applebot-Extended', allow: '/', disallow: ['/api/', '/mi-cuenta', '/mi-cuenta/', '/ingresar', '/ingresar/', '/mi-carrito', '/mi-carrito/', '/suscripcion', '/suscripcion/'] },
      // Block pure training/scraping bots (low citation value)
      { userAgent: 'anthropic-ai', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
      { userAgent: 'Amazonbot', disallow: '/' },
      { userAgent: 'meta-externalagent', disallow: '/' },
      // Block known scraper frameworks
      { userAgent: 'Scrapy', disallow: '/' },
      { userAgent: 'MJ12bot', disallow: '/' },
      { userAgent: 'AhrefsBot', disallow: '/' },
      { userAgent: 'SemrushBot', disallow: '/' },
      { userAgent: 'DotBot', disallow: '/' },
      { userAgent: 'MegaIndex', disallow: '/' },
      { userAgent: 'BLEXBot', disallow: '/' },
      { userAgent: 'DataForSeoBot', disallow: '/' },
    ],
    sitemap: 'https://www.dentalprecios.cl/sitemap.xml',
  }
}
