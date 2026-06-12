export interface SeasonalEntry {
  headline: string;
  subtext: string;
  emoji: string;
  gradient: string;
  link: string;
  // The pending_events category value this entry surfaces (URL-safe).
  category: string;
  // Human-readable display label, used for page headings and category pickers.
  label: string;
  // Date range (inclusive) this entry is active, as "MM-DD"
  startDate: string;
  endDate: string;
}

export const SEASONAL_ENTRIES: SeasonalEntry[] = [
  {
    headline: "Celebrate Juneteenth ✊🏾",
    subtext: "Find Juneteenth events near you",
    emoji: "✊🏾",
    gradient: "linear-gradient(90deg,#bf0a30,#000000,#00843d)",
    link: "/events/Juneteenth",
    category: "Juneteenth",
    label: "Juneteenth",
    startDate: "06-12",
    endDate: "06-19",
  },
  {
    headline: "June is the Month of Pride 🏳️‍🌈",
    subtext: "Find Pride events near you",
    emoji: "🏳️‍🌈",
    // A simple rainbow gradient; update as needed per month
    gradient: "linear-gradient(90deg,#ff3cac,#ff9a3c,#ffd93d,#3cffb0,#3c8cff)",
    link: "/events/Pride",
    category: "Pride",
    label: "Pride",
    startDate: "06-20",
    endDate: "06-30",
  },
  {
    headline: "Light Up Your 4th 🎆",
    subtext: "Find 4th of July events near you",
    emoji: "🎆",
    gradient: "linear-gradient(90deg,#b22234,#ffffff,#3c3b6e)",
    link: "/events/July4th",
    category: "July4th",
    label: "4th of July",
    startDate: "06-28",
    endDate: "07-05",
  },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthDayToDate(monthDay: string, year: number): Date {
  const [month, day] = monthDay.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isActiveOn(entry: SeasonalEntry, date: Date): boolean {
  const year = date.getFullYear();
  const start = monthDayToDate(entry.startDate, year);
  const end = monthDayToDate(entry.endDate, year);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

// Returns the next occurrence of "MM-DD" on or after `fromDate`, rolling
// over to next year if this year's occurrence has already passed.
function nextOccurrence(monthDay: string, fromDate: Date): Date {
  const today = startOfDay(fromDate);
  let candidate = monthDayToDate(monthDay, today.getFullYear());
  if (candidate < today) {
    candidate = monthDayToDate(monthDay, today.getFullYear() + 1);
  }
  return candidate;
}

// Number of days until an entry's next start date (0 if it starts today).
function daysUntilStart(entry: SeasonalEntry, date: Date): number {
  const start = nextOccurrence(entry.startDate, date);
  const today = startOfDay(date);
  return Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Returns the seasonal entry active on the given date, or null if none.
// If multiple entries' ranges overlap, the one ending soonest wins.
export function getActiveSeasonal(date: Date = new Date()): SeasonalEntry | null {
  const active = SEASONAL_ENTRIES.filter((entry) => isActiveOn(entry, date));
  if (active.length === 0) return null;

  return active.reduce((soonest, entry) => {
    const year = date.getFullYear();
    const soonestEnd = monthDayToDate(soonest.endDate, year);
    const entryEnd = monthDayToDate(entry.endDate, year);
    return entryEnd < soonestEnd ? entry : soonest;
  });
}

// Formats an entry's date range for display, e.g. "June 28–July 5" or "June 20–30".
export function formatDateRange(entry: SeasonalEntry): string {
  const [startMonth, startDay] = entry.startDate.split("-").map(Number);
  const [endMonth, endDay] = entry.endDate.split("-").map(Number);

  const start = `${MONTH_NAMES[startMonth - 1]} ${startDay}`;
  const end =
    startMonth === endMonth ? `${endDay}` : `${MONTH_NAMES[endMonth - 1]} ${endDay}`;

  return `${start}–${end}`;
}

// Seasonal entries that are either active today or start within the next
// `withinDays` days, so submissions/categorization can open early.
export function getSeasonalCategoryOptions(
  date: Date = new Date(),
  withinDays: number = 45
): { entry: SeasonalEntry; active: boolean }[] {
  return SEASONAL_ENTRIES.filter((entry) => {
    if (isActiveOn(entry, date)) return true;
    const days = daysUntilStart(entry, date);
    return days >= 0 && days <= withinDays;
  }).map((entry) => ({ entry, active: isActiveOn(entry, date) }));
}
