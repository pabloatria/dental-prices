import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Old category slugs that were reorganized — 301 to preserve SEO equity
      { source: '/categorias/bandas-matrices', destination: '/categorias/matrices-cunas', permanent: true },
      { source: '/categorias/acrilicos-materiales-cubeta', destination: '/categorias/laboratorio', permanent: true },
      { source: '/categorias/aleaciones-accesorios', destination: '/categorias/laboratorio', permanent: true },
      { source: '/categorias/confort-proteccion', destination: '/categorias/control-infecciones-personal', permanent: true },
      { source: '/categorias/suministros-oficina', destination: '/categorias/miscelaneos', permanent: true },
      { source: '/categorias/fresas-y-diamantes', destination: '/categorias/fresas-diamantes', permanent: true },
      { source: '/categorias/cementos-y-adhesivos', destination: '/categorias/cementos-adhesivos', permanent: true },
      { source: '/categorias/acabado-y-pulido', destination: '/categorias/acabado-pulido', permanent: true },
      { source: '/categorias/coronas-y-cofias', destination: '/categorias/coronas-cofias', permanent: true },
      { source: '/categorias/jeringas-y-agujas', destination: '/categorias/jeringas-agujas', permanent: true },
      { source: '/categorias/lupas-y-lamparas', destination: '/categorias/lupas-lamparas', permanent: true },
      // /precios has no index page — Google inferred it from subcategory URLs
      { source: '/precios', destination: '/categorias', permanent: true },
      { source: '/categorias/matrices-y-cunas', destination: '/categorias/matrices-cunas', permanent: true },
      { source: '/categorias/pernos-y-postes', destination: '/categorias/pernos-postes', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        // Prevent search engines from indexing API responses
        source: '/api/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      // User-private pages. These 307-redirect to /ingresar when the user is
      // not logged in, which happens BEFORE React renders, so the
      // component-level metadata.robots never fires. Googlebot sees a 307 and
      // follows it. Setting X-Robots-Tag at the HTTP level means Google honors
      // noindex regardless of whether the page renders content or redirects.
      // Separate rules per path because Next.js headers() uses path-to-regexp,
      // where `:param(alt1|alt2)` matches a single segment, not alternation
      // across paths.
      { source: '/mi-cuenta', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/mi-cuenta/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/mi-carrito', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/mi-carrito/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/ingresar', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/ingresar/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/suscripcion', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/suscripcion/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      {
        // Security headers for all pages
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Robots-Tag', value: 'noai, noimageai' },
        ],
      },
    ]
  },
};

export default nextConfig;
