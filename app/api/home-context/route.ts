import { NextResponse } from "next/server";
import { TONIGHT_RAILS, TODAY_RAILS } from "@/lib/homeRails";

// No cookies/headers/request-dependent input, so Next 14 would statically
// cache this at build time otherwise (see CLAUDE.md's pins-route gotcha).
// Harmless today since the rails are static config either way, but this
// keeps the route correct if rail selection ever becomes conditional again.
export const dynamic = "force-dynamic";

/**
 * All home rails (Daytime Picks, Popular Picks, Date Night, Budget-Friendly,
 * Casual Fun) render together on Picks regardless of time of day — no more
 * 4am-4pm daytime/nightlife mode switch (that split made a Tuesday-afternoon
 * visitor see one Daytime rail and nothing else). Each rail already
 * self-hides via MIN_RAIL_VENUES if its category is thin, so combining them
 * doesn't risk a sparse-feeling page.
 */
export async function GET() {
  return NextResponse.json({ rails: [...TODAY_RAILS, ...TONIGHT_RAILS] });
}
