import { NextResponse } from "next/server";
import { getNightlifeContext } from "@/lib/cincyDate";
import { TONIGHT_RAILS, TODAY_RAILS } from "@/lib/homeRails";

// This has no request-dependent inputs Next.js recognizes (no cookies,
// headers, searchParams, or body), so without this it gets statically
// optimized at build time — the day/night mode would freeze at whatever
// it was during the Vercel build, forever. Force it to run per-request.
export const dynamic = "force-dynamic";

/**
 * Tells the client which set of home rails to render right now. This has
 * to be a server round-trip rather than a client-side `new Date()` check —
 * the browser's clock reflects the device's own timezone, not
 * Cincinnati's, and get_rail_venues's day-scoping needs to agree with
 * whichever rail set actually renders (both derive from the same 4am
 * rollover in getNightlifeContext, see app/api/rank/rail/route.ts).
 */
export async function GET() {
  const { mode, dayOfWeek } = getNightlifeContext();
  const rails = mode === "daytime" ? TODAY_RAILS : TONIGHT_RAILS;
  return NextResponse.json({ mode, dayOfWeek, rails });
}
