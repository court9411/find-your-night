import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ScoutTierProgress } from "@/lib/checkin";

const TIER_THRESHOLDS = [
  { name: "City Scout", min: 100 },
  { name: "Verified Scout", min: 25 },
  { name: "Scout", min: 5 },
  { name: "New Scout", min: 0 },
] as const;

function tierFor(count: number): string {
  return TIER_THRESHOLDS.find((t) => count >= t.min)!.name;
}

function nextTierProgress(count: number): ScoutTierProgress | null {
  if (count < 5) return { nextTier: "Scout", remaining: 5 - count };
  if (count < 25) return { nextTier: "Verified Scout", remaining: 25 - count };
  if (count < 100) return { nextTier: "City Scout", remaining: 100 - count };
  return null;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count, error } = await supabaseAdmin
    .from("venue_checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("checkin_type", "scout");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const checkinCount = count ?? 0;
  return NextResponse.json({
    checkinCount,
    tier: tierFor(checkinCount),
    progress: nextTierProgress(checkinCount),
  });
}
