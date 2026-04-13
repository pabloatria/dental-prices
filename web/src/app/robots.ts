import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/mi-cuenta/', '/ingresar/', '/mi-carrito/'],
      },
      // Explicitly allow search engines (including /_next/ for CSS/JS rendering)
      // Must repeat disallow rules — Google ignores the * group when a Googlebot group exists
      { userAgent: 'Googlebot', allow: ['/', '/_next/'], disallow: ['/api/', '/mi-cuenta/', '/ingresar/', '/mi-carrito/'] },
      { userAgent: 'Bingbot', allow: ['/', '/_next/'], disallow: ['/api/', '/mi-cuenta/', '/ingresar/', '/mi-carrito/'] },
      // Allow AI retrieval/citation bots (GEO — appear in AI-generated answers)
      { userAgent: 'GPTBot', allow: '/', disallow: ['/api/', '/mi-cuenta/', '/ingresar/', '/mi-carrito/'] },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: ['/api/', '/mi-cuenta/', '/ingresar/', '/mi-carrito/'] },
      { userAgent: 'ClaudeBot', allow: '/', disallow: ['/api/', '/mi-cuenta/', '/ingresar/', '/mi-carrito/'] },
      { userAgent: 'PerplexityBot', allow: '/', disallow: ['/api/', '/mi-cuenta/', '/ingresar/', '/mi-carrito/'] },
      { userAgent: 'Google-Extended', allow: '/', disallow: ['/api/', '/mi-cuenta/', '/ingresar/', '/mi-carrito/'] },
      { userAgent: 'Applebot-Extended', allow: '/', disallow: ['/api/', '/mi-cuenta/', '/ingresar/', '/mi-carrito/'] },
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
