import { NextResponse } from "next/server";
import { TONIGHT_RAILS, TODAY_RAILS } from "@/lib/homeRails";
import { getNightlifeContext } from "@/lib/cincyDate";

// No cookies/headers/request-dependent input, so Next 14 would statically
// cache this at build time otherwise (see CLAUDE.md's pins-route gotcha).
// Rail *set* is static, but rail *order* now depends on time of day (below),
// so this genuinely needs to stay dynamic.
export const dynamic = "force-dynamic";

/**
 * All home rails (Daytime Picks, Popular Picks, Date Night, Budget-Friendly,
 * Casual Fun) render together on Picks regardless of time of day — no more
 * 4am-4pm daytime/nightlife mode switch that hid whichever set didn't match
 * (that made a Tuesday-afternoon visitor see one Daytime rail and nothing
 * else). Each rail already self-hides via MIN_RAIL_VENUES if its category
 * is thin, so combining them doesn't risk a sparse-feeling page.
 *
 * Order, not presence, is what should track time of day: Daytime Picks
 * leads during the 4am-4pm window (getNightlifeContext, same day/night
 * boundary used for trending_featured_days scoping) and sinks below the
 * nightlife rails once evening hits — a coffee-shop rail outranking Popular
 * Picks at 10pm doesn't serve anyone.
 */
export async function GET() {
  const { mode } = getNightlifeContext();
  const rails = mode === "daytime" ? [...TODAY_RAILS, ...TONIGHT_RAILS] : [...TONIGHT_RAILS, ...TODAY_RAILS];
  return NextResponse.json({ rails });
}
