interface SeedPickerAffinityParams {
  userId?: string | null;
  anonId?: string | null;
  likedVenueIds: string[];
}

/**
 * Seeds user_tag_affinity from this session's swipe-right venues so the
 * *next* get_ranked_venues call (a refill mid-session, or a later Picks/
 * picker visit) actually reflects what was swiped, instead of scoring
 * everyone's pref_match as a flat default. Never throws — a failure here
 * degrades to "didn't get smarter this time," not a broken picker.
 */
export async function seedPickerAffinity({ userId, anonId, likedVenueIds }: SeedPickerAffinityParams): Promise<void> {
  if (likedVenueIds.length === 0) return;
  try {
    await fetch("/api/picker/seed-affinity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, anonId, likedVenueIds }),
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("seedPickerAffinity failed:", err);
    }
  }
}
