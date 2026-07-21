import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_REQUESTS_PER_WINDOW = 60;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NIGHT_OR_DAY = new Set(["night", "day"]);
const GROUP_SIZES = new Set(["solo", "2", "3-5", "6+"]);
const AGE_RANGES = new Set(["21-24", "25-29", "30-34", "35-44", "45+"]);

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited("picker-swipe", ip, MAX_REQUESTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: {
    userId?: unknown;
    anonId?: unknown;
    venueId?: unknown;
    nightOrDay?: unknown;
    groupSize?: unknown;
    ageRange?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : null;
  const anonId = typeof body.anonId === "string" ? body.anonId : null;
  const venueId = typeof body.venueId === "string" ? body.venueId : "";
  const nightOrDay = typeof body.nightOrDay === "string" ? body.nightOrDay : "";
  const groupSize = typeof body.groupSize === "string" ? body.groupSize : "";
  const ageRange = typeof body.ageRange === "string" ? body.ageRange : "";

  if (!UUID_REGEX.test(venueId) || !NIGHT_OR_DAY.has(nightOrDay) || !GROUP_SIZES.has(groupSize) || !AGE_RANGES.has(ageRange)) {
    return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
  }
  if (!userId && !anonId) {
    return NextResponse.json({ error: "userId or anonId is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("picker_swipes").insert({
    user_id: userId,
    anon_id: anonId,
    venue_id: venueId,
    night_or_day: nightOrDay,
    group_size: groupSize,
    age_range: ageRange,
  });

  if (error) {
    // picker_swipes is a newly-proposed table (see supabase/add_picker_swipes.sql)
    // that may not be applied in every environment yet — degrade the same way
    // /api/rank/rail does when get_rail_venues isn't deployed: log it, don't
    // fail the swipe interaction the user is mid-flow on.
    console.error("picker_swipes insert error:", error);
    return NextResponse.json({ ok: false });
  }

  return NextResponse.json({ ok: true });
}
