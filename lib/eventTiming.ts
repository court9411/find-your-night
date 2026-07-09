import { getTonightDateString } from "./cincyDate";

const CINCY_TZ = "America/New_York";

export interface EventTimingInput {
  date: string; // "YYYY-MM-DD"
  end_time: string | null;
}

/**
 * Returns the UTC offset (in minutes) `timeZone` has at `date`, handling
 * DST automatically. Used to convert a wall-clock local date+time into a
 * real instant without a date library — format the instant in the target
 * zone, diff against the UTC reading of the same instant.
 */
function getTimeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second)
  );
  return (asUTC - date.getTime()) / 60000;
}

/** Converts a Cincinnati-local wall-clock date+time into the real instant it occurs at. */
function easternWallClockToInstant(dateStr: string, hour: number, minute: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute, 0));
  const offsetMinutes = getTimeZoneOffsetMinutes(CINCY_TZ, guess);
  return new Date(guess.getTime() - offsetMinutes * 60000);
}

/** Parses "7:00 PM" or "19:00" style time strings. Returns null if unparseable. */
function parseTimeToHourMinute(time: string): { hour: number; minute: number } | null {
  const trimmed = time.trim();

  const twelveHour = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]) % 12;
    if (twelveHour[3].toUpperCase() === "PM") hour += 12;
    return { hour, minute: Number(twelveHour[2]) };
  }

  const twentyFourHour = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) {
    return { hour: Number(twentyFourHour[1]), minute: Number(twentyFourHour[2]) };
  }

  return null;
}

/**
 * The single source of truth for "has this event ended" — every rollover
 * check in the app (Lineup rail filter, the Did-You-Go trigger, "tonight"
 * badges) must call this instead of re-deriving its own date/time logic, or
 * they can silently disagree with each other.
 *
 * - If end_time is set and parseable: real timestamp comparison against
 *   date + end_time, in Cincinnati local time.
 * - Otherwise: the existing 4am-rollover heuristic — the event's date
 *   counts as "current" until 4am the following day. This is exactly what
 *   an "Until Close" event (end_time left null) means.
 */
export function isEventOver(event: EventTimingInput, now: Date = new Date()): boolean {
  if (event.end_time) {
    const parsed = parseTimeToHourMinute(event.end_time);
    if (parsed) {
      const endInstant = easternWallClockToInstant(event.date, parsed.hour, parsed.minute);
      return now.getTime() > endInstant.getTime();
    }
  }
  return event.date < getTonightDateString(now);
}
