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

export interface HoursStatus {
  text: string;
  closingSoon: boolean;
}

const CLOSING_SOON_MINUTES = 60;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatClockTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
}

/**
 * Formats a single-line hours status ("Open until 11:00 PM" / "Closes soon ·
 * 11:00 PM" / "Closed · Opens Fri 6:00 PM") from stored weekly hours. Shares
 * isVenueOpenNow's open/closed logic but also surfaces the close or
 * next-open time, since the detail card needs more than a boolean.
 */
export function getHoursStatus(
  regularHours: RegularHours | null | undefined,
  now: Date = new Date()
): HoursStatus | null {
  const periods = regularHours?.periods;
  if (!periods || periods.length === 0) return null;

  if (periods.length === 1 && !periods[0].close) {
    return { text: "Open 24 hours", closingSoon: false };
  }

  const { day, minutes } = getCincyDayAndMinutes(now);
  const nowMinutes = day * 24 * 60 + minutes;

  let openNow: { closePoint: HoursPoint; minutesUntilClose: number } | null = null;
  let nextOpen: { gap: number; point: HoursPoint } | null = null;

  for (const period of periods) {
    if (!period.close) continue;
    const openMinutes = toWeekMinutes(period.open);
    let closeMinutes = toWeekMinutes(period.close);
    if (closeMinutes <= openMinutes) closeMinutes += MINUTES_PER_WEEK; // wraps past the week boundary

    if (nowMinutes >= openMinutes && nowMinutes < closeMinutes) {
      openNow = { closePoint: period.close, minutesUntilClose: closeMinutes - nowMinutes };
    } else if (nowMinutes + MINUTES_PER_WEEK >= openMinutes && nowMinutes + MINUTES_PER_WEEK < closeMinutes) {
      openNow = { closePoint: period.close, minutesUntilClose: closeMinutes - (nowMinutes + MINUTES_PER_WEEK) };
    }

    const gap = openMinutes >= nowMinutes ? openMinutes - nowMinutes : openMinutes + MINUTES_PER_WEEK - nowMinutes;
    if (!nextOpen || gap < nextOpen.gap) {
      nextOpen = { gap, point: period.open };
    }
  }

  if (openNow) {
    const closeTime = formatClockTime(openNow.closePoint.hour, openNow.closePoint.minute);
    const closingSoon = openNow.minutesUntilClose <= CLOSING_SOON_MINUTES;
    return {
      text: closingSoon ? `Closes soon · ${closeTime}` : `Open until ${closeTime}`,
      closingSoon,
    };
  }

  if (nextOpen) {
    const openTime = formatClockTime(nextOpen.point.hour, nextOpen.point.minute);
    return { text: `Closed · Opens ${DAY_NAMES[nextOpen.point.day]} ${openTime}`, closingSoon: false };
  }

  return null;
}
