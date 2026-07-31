import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { MUSIC_OPTION_GENRE_KEYS } from "@/lib/preferenceOptions";

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
  //
  // seed_onboarding_preferences, not seed_tag_affinity_from_onboarding: the
  // latter is a plain INSERT with no ON CONFLICT handling against
  // user_tag_affinity's unique (user_id, tag) index, so any onboarding tag
  // that collides with an existing behavior/picker-sourced tag (e.g.
  // "drinks" -> "cocktails", near-guaranteed for any active user) aborts
  // the entire multi-row insert and silently seeds nothing. This one uses
  // ON CONFLICT ... DO UPDATE (same pattern as log_user_action), so a
  // colliding tag just adds its weight instead of nuking the whole batch.
  if (activityInterests.length > 0) {
    const { error } = await supabaseAdmin.rpc("seed_onboarding_preferences", {
      p_user_id: userId,
      p_anon_id: userId ? null : anonId,
      p_selected_options: activityInterests,
    });
    if (error) {
      console.error("seed_onboarding_preferences RPC error:", error);
    }
  }

  // musicPrefs values are MUSIC_OPTIONS display labels ("Hip-Hop / Rap"),
  // not the snake_case keys log_genre_preferences/user_genre_preferences
  // expect — map before sending. Raw picks only, not connected to scoring;
  // idempotent via a unique constraint + ON CONFLICT DO NOTHING on the DB
  // side, so no dedup needed here even if onboarding re-runs.
  if (musicPrefs.length > 0) {
    const genres = musicPrefs
      .map((label) => MUSIC_OPTION_GENRE_KEYS[label])
      .filter((key): key is string => !!key);

    if (genres.length > 0) {
      const { error } = await supabaseAdmin.rpc("log_genre_preferences", {
        p_user_id: userId,
        p_anon_id: userId ? null : anonId,
        p_genres: genres,
      });
      if (error) {
        console.error("log_genre_preferences RPC error:", error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
