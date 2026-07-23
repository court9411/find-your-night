import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_REQUESTS_PER_WINDOW = 30;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited("onboarding-complete", ip, MAX_REQUESTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: {
    userId?: unknown;
    anonId?: unknown;
    activityInterests?: unknown;
    musicPrefs?: unknown;
    priceLevels?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : null;
  const anonId = typeof body.anonId === "string" ? body.anonId : null;
  const activityInterests = Array.isArray(body.activityInterests)
    ? body.activityInterests.filter((v): v is string => typeof v === "string")
    : [];
  const musicPrefs = Array.isArray(body.musicPrefs)
    ? body.musicPrefs.filter((v): v is string => typeof v === "string")
    : [];
  const priceLevels = Array.isArray(body.priceLevels)
    ? body.priceLevels.filter((v): v is number => typeof v === "number")
    : [];

  if (!userId && !anonId) {
    return NextResponse.json({ error: "userId or anonId is required" }, { status: 400 });
  }

  // onboarding_completed_at lives on user_profiles, keyed by auth user id —
  // anon-only visitors have no row to set it on. The narrative flow's
  // existing localStorage ONBOARDED_KEY already covers "asked once" for
  // that case, so this just no-ops the profile write and still seeds
  // affinity below via anonId.
  if (userId) {
    // Omit empty arrays rather than writing them — a skipped screen
    // shouldn't blank out preferences a user already set elsewhere (e.g.
    // Profile edit) before landing in this one-time gate.
    const profileUpdate: Record<string, unknown> = {
      id: userId,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (activityInterests.length > 0) profileUpdate.activity_interests = activityInterests;
    if (musicPrefs.length > 0) profileUpdate.music_prefs = musicPrefs;
    if (priceLevels.length > 0) profileUpdate.price_levels = priceLevels;

    await supabaseAdmin.from("user_profiles").upsert(profileUpdate, { onConflict: "id" });
  }

  // activityInterests values already are onboarding_vibe_map.ui_option keys
  // (ACTIVITY_OPTIONS in lib/preferenceOptions.ts) — no translation needed.
  if (activityInterests.length > 0) {
    const { error } = await supabaseAdmin.rpc("seed_tag_affinity_from_onboarding", {
      p_user_id: userId,
      p_anon_id: userId ? null : anonId,
      p_selected_options: activityInterests,
    });
    if (error) {
      console.error("seed_tag_affinity_from_onboarding RPC error:", error);
    }
  }

  return NextResponse.json({ ok: true });
}
