import { getCincyDayAndMinutes } from "@/lib/cincyDate";

interface HoursPoint {
  day: number; // 0=Sunday..6=Saturday, per Google Places API
  hour: number;
  minute: number;
}

interface OpeningPeriod {
  open: HoursPoint;
  close?: HoursPoint; // absent means open 24 hours from `open` onward
}

export interface RegularHours {
  periods: OpeningPeriod[];
}

const MINUTES_PER_WEEK = 7 * 24 * 60;

function toWeekMinutes(point: HoursPoint): number {
  return point.day * 24 * 60 + point.hour * 60 + point.minute;
}

/**
 * Computes whether a venue is open right now from its stored weekly hours
 * (Google Places API "regularOpeningHours" periods), rather than trusting
 * Google's own `openNow` flag — that's a snapshot from whenever we last
 * fetched it, which goes stale immediately since hours are cached monthly.
 *
 * Returns null when there's no usable data, so callers can hide the "Open
 * now" badge entirely instead of showing a wrong one.
 */
export function isVenueOpenNow(
  regularHours: RegularHours | null | undefined,
  now: Date = new Date()
): boolean | null {
  const periods = regularHours?.periods;
  if (!periods || periods.length === 0) return null;

  // Google represents "open 24/7" as a single open-only period with no close.
  if (periods.length === 1 && !periods[0].close) return true;

  const { day, minutes } = getCincyDayAndMinutes(now);
  const nowMinutes = day * 24 * 60 + minutes;

  for (const period of periods) {
    if (!period.close) continue; // malformed/partial entry — skip rather than guess
    const openMinutes = toWeekMinutes(period.open);
    let closeMinutes = toWeekMinutes(period.close);
    if (closeMinutes <= openMinutes) closeMinutes += MINUTES_PER_WEEK; // wraps past the week boundary

    if (nowMinutes >= openMinutes && nowMinutes < closeMinutes) return true;
    // Also check the "next week" alias of now, for periods that wrap from
    // Saturday night into Sunday morning while now is early in the week.
    if (nowMinutes + MINUTES_PER_WEEK >= openMinutes && nowMinutes + MINUTES_PER_WEEK < closeMinutes) return true;
  }

  return false;
}
