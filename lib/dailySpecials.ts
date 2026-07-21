/**
 * Recurring weekly specials (Taco Tuesday, Wing Wednesday, etc.) aren't a
 * separate table or submission flow — they're just a venue's existing
 * vibe_tags. A tag surfaces here the moment its text contains today's
 * Cincinnati weekday (matched via getNightlifeContext's dayOfWeek), so
 * adding one is a plain vibe_tags edit, no migration or admin UI needed.
 */
export function findDailySpecial(tags: string[] | null | undefined, dayOfWeek: string): string | null {
  if (!tags || tags.length === 0) return null;
  const day = dayOfWeek.toLowerCase();
  return tags.find((t) => t.toLowerCase().includes(day)) ?? null;
}
