import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

/**
 * Server-only client that bypasses RLS. Never import this from client components.
 *
 * The custom fetch forces `cache: "no-store"` on every request so Next.js's
 * fetch Data Cache never freezes a query response. `export const dynamic =
 * "force-dynamic"` on a route only stops the *route* from being statically
 * rendered — it does NOT reach supabase-js's underlying fetch, so an
 * unfiltered query (stable URL) would otherwise get cached once and served
 * stale forever. This bit /api/venues/pins twice (map pins never updating
 * after a check-in, prod only, invisible in `next dev`). Every read through
 * this client is live/admin data that must be fresh, so no-store is correct
 * across the board here.
 */
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
  global: { fetch: noStoreFetch },
});
