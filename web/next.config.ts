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
