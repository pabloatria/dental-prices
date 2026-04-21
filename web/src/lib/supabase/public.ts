import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Cookie-free Supabase client for public server components.
 *
 * WHY THIS EXISTS:
 * `@/lib/supabase/server` calls `cookies()` from next/headers, which forces
 * Next.js to mark the caller as dynamic → Vercel serves with
 * `cache-control: private, no-store` → ISR (`export const revalidate = N`)
 * is silently bypassed.
 *
 * Use this client in server components that only READ public data (products,
 * prices, categories, blog posts, etc.) and don't need the logged-in user's
 * session. The page then stays statically renderable with ISR and is served
 * from Vercel's edge cache.
 *
 * DO NOT use this client for:
 * - /mi-cuenta, /mi-carrito pages that need session.user
 * - API routes that insert/update on behalf of a user
 * - Any path where RLS policies depend on auth.uid()
 *
 * For those, keep using `@/lib/supabase/server` (`createClient`).
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
}
