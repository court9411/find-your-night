/**
 * Date helpers anchored to Cincinnati's local clock (America/New_York).
 *
 * Plain `new Date().toISOString()` / `new Date()` reflect UTC or the host's
 * timezone — on Vercel that's UTC, which is 4-5 hours ahead of Cincinnati.
 * After ~8pm Eastern, "today" in UTC has already rolled to tomorrow, so any
 * "what's happening tonight" query using those would silently start
 * matching tomorrow's date instead. Always go through these helpers when
 * deciding what "today"/"tonight" means for Cincinnati users.
 */

const CINCY_TZ = "America/New_York";

/** Returns today's date in Cincinnati local time, as "YYYY-MM-DD". */
export function getCincyDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CINCY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

/**
 * Returns "today"'s date string for "tonight" purposes — stays on last
 * night's date until 4am, since a night out doesn't end at midnight.
 */
export function getTonightDateString(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() - 4 * 60 * 60 * 1000);
  return getCincyDateString(shifted);
}

/** Returns today's weekday name (e.g. "Friday") in Cincinnati local time. */
export function getCincyWeekday(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CINCY_TZ,
    weekday: "long",
  }).format(date);
}

/** Adds `days` to a "YYYY-MM-DD" date string and returns the result in the same format. */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().split("T")[0];
}

/** Formats a point in time (default: now + `daysFromNow`) as e.g. "June 26, 2026" in Cincinnati local time. */
export function getCincyLongDate(daysFromNow = 0): string {
  const instant = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CINCY_TZ,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(instant);
}

/** Formats an ISO timestamp as e.g. "8:00 PM" in Cincinnati local time. */
export function formatCincyTime(isoString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CINCY_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(isoString));
}

export type NightlifeMode = "daytime" | "nightlife";

export interface NightlifeContext {
  mode: NightlifeMode;
  dayOfWeek: string;
}

/**
 * Determines the daytime (4am-4pm) vs. nightlife (4pm-4am) window a moment
 * falls in, and which calendar day that window belongs to. The nightlife
 * window rolls over at 4am, not midnight — 1:30am Friday is still
 * "Thursday night" (matters for venues.trending_featured_days scoping,
 * which would otherwise flip to Friday mid-night). Always compute this
 * server-side: a client Date() reflects the device's own clock/timezone,
 * not Cincinnati's.
 */
export function getNightlifeContext(now: Date = new Date(), timezone: string = CINCY_TZ): NightlifeContext {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" }).format(now)
  );
  const mode: NightlifeMode = hour >= 4 && hour < 16 ? "daytime" : "nightlife";

  // Same rollover as getTonightDateString: before 4am local, this moment
  // still belongs to the previous calendar day's night.
  const effectiveInstant = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const dayOfWeek = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" })
    .format(effectiveInstant)
    .toLowerCase();

  return { mode, dayOfWeek };
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Returns the current day-of-week (0=Sunday..6=Saturday, matching Google
 * Places API's day numbering) and minutes-since-midnight, both in
 * Cincinnati local time. Used for computing whether a venue is open right
 * now from its stored weekly hours — see lib/venueHours.ts.
 */
export function getCincyDayAndMinutes(date: Date = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CINCY_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    day: WEEKDAY_INDEX[lookup.weekday],
    minutes: Number(lookup.hour) * 60 + Number(lookup.minute),
  };
}
