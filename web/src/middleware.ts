import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// --- Rate limiter (in-memory, per edge instance) ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX_API = 30 // max API requests per minute per IP
const RATE_LIMIT_MAX_SEARCH = 15 // stricter for search endpoints

function isRateLimited(ip: string, maxRequests: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }

  entry.count++
  return entry.count > maxRequests
}

// Clean up stale entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap) {
    if (now > value.resetAt) rateLimitMap.delete(key)
  }
}, 60_000)

// --- Known scraper/bot user agents to block ---
const BLOCKED_BOTS = [
  'scrapy', 'python-requests', 'python-urllib', 'httpclient',
  'go-http-client', 'java/', 'wget', 'curl/',
  'libwww-perl', 'mechanize', 'httpie',
  'node-fetch', 'axios/', 'got/',
  'colly', 'aiohttp', 'httpx',
  'scraperapi', 'scrapingbee', 'brightdata',
  'phantomjs', 'headlesschrome',
  'selenium', 'puppeteer', 'playwright',
]

function isBlockedBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return BLOCKED_BOTS.some(bot => ua.includes(bot))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userAgent = request.headers.get('user-agent') || ''
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'

  // --- Bot protection for API routes ---
  if (pathname.startsWith('/api/')) {
    // Block known scraper user agents
    if (isBlockedBot(userAgent)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Block requests with no user agent (likely bots)
    if (!userAgent || userAgent.length < 10) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Rate limiting — stricter for search endpoints
    const isSearch = pathname.startsWith('/api/search')
    const limit = isSearch ? RATE_LIMIT_MAX_SEARCH : RATE_LIMIT_MAX_API
    const rateLimitKey = isSearch ? `search:${ip}` : `api:${ip}`

    if (isRateLimited(rateLimitKey, limit)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
  }

  // --- Honeypot: catch bots that ignore robots.txt ---
  if (pathname === '/api/data-export' || pathname === '/api/prices-dump') {
    // Log and block — real users would never hit these endpoints
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }

  // --- Supabase auth — ONLY for paths that need a user session ---
  // Running auth.getUser() on every request sets cookies, which forces Vercel
  // to serve the response with `cache-control: private, no-store` — that
  // disables ISR across the entire site. Most pages (/, /categorias,
  // /producto/*, /precios/*, /blog/*, etc.) are public and don't need a
  // session check, so we skip the auth roundtrip on them and let ISR work.
  const needsAuth =
    pathname.startsWith('/mi-cuenta') ||
    pathname.startsWith('/mi-carrito') ||
    pathname.startsWith('/ingresar') ||
    pathname.startsWith('/suscripcion') ||
    pathname.startsWith('/api/alerts') ||
    pathname.startsWith('/api/favorites') ||
    pathname.startsWith('/api/stock-alerts') ||
    pathname.startsWith('/api/subscription') ||
    pathname.startsWith('/api/ratings') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/auth/')

  if (!needsAuth) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()
  return supabaseResponse
}

// POSITIVE matcher — the middleware runs only on paths that actually benefit
// from it. Previously this was a negative exclusion that caused middleware to
// execute on every HTML page, sitemap, robots.txt, manifest, etc. — all of
// which returned NextResponse.next() and did nothing. Those wasted invocations
// were the #1 Vercel function-invocation cost driver on this project.
//
// The middleware's actual jobs:
//   1. Bot-block + rate-limit /api/* (including honeypot routes)
//   2. Supabase auth refresh on session-dependent paths
//
// Everything else (/, /categorias/*, /producto/*, /precios/*, /blog/*, /buscar,
// robots.txt, sitemap.xml, images, CSS) now bypasses middleware entirely and
// is served straight from ISR / static cache.
export const config = {
  matcher: [
    // API routes — rate limiting + bot blocking + honeypot
    '/api/:path*',
    // Session-dependent pages — Supabase auth refresh
    '/mi-cuenta/:path*',
    '/mi-carrito/:path*',
    '/ingresar/:path*',
    '/suscripcion/:path*',
    '/auth/:path*',
    // Root-level equivalents (no trailing /)
    '/mi-cuenta',
    '/mi-carrito',
    '/ingresar',
    '/suscripcion',
  ],
}
