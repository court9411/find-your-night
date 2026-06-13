/**
 * Formats an event date/time for display, e.g. "Sun, June 14 · 12:00 PM"
 * instead of the raw "2026-06-14 at 12:00 PM".
 */
export function formatEventDateLine(date?: string | null, time?: string | null): string {
  if (!date) return time ?? "";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return time ? `${date} · ${time}` : date;

  const formattedDate = parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  });

  return time ? `${formattedDate} · ${time}` : formattedDate;
}
