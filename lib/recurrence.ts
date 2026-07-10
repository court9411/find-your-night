import { getCincyDateString } from "./cincyDate";

export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly";

export const RECURRENCE_FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every other week" },
  { value: "monthly", label: "Monthly" },
];

export const RECURRENCE_WEEKDAYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;

const WEEKDAY_LABELS: Record<string, string> = {
  sunday: "Sunday", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday",
};

export interface RecurrenceRule {
  is_recurring?: boolean | null;
  recurrence_frequency?: RecurrenceFrequency | null;
  recurrence_days?: string[] | null;
  recurrence_end_date?: string | null;
  date: string;
}

function toEpochDay(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function fromEpochDay(epochDay: number): string {
  return new Date(epochDay * 86400000).toISOString().split("T")[0];
}

// Epoch day 0 (1970-01-01) was a Thursday (index 4 in a Sunday-first week).
function weekdayOfEpochDay(epochDay: number): number {
  return ((epochDay % 7) + 7 + 4) % 7;
}

/**
 * Computes the next occurrence (on/after `referenceDate`) of a recurring
 * event template. Recurring events are never pre-generated as rows — this
 * is computed at query/display time from the template's anchor `date` and
 * its recurrence rule. Returns null for non-recurring events, malformed
 * rules, or a recurrence whose end date has already passed.
 */
export function getNextOccurrence(
  rule: RecurrenceRule,
  referenceDate: string = getCincyDateString()
): string | null {
  if (!rule.is_recurring || !rule.recurrence_frequency) return null;
  if (rule.recurrence_end_date && rule.recurrence_end_date < referenceDate) return null;

  if (rule.recurrence_frequency === "monthly") {
    let [y, m] = rule.date.split("-").map(Number);
    const d = Number(rule.date.split("-")[2]);
    let candidate = rule.date;
    for (let guard = 0; guard < 24 && candidate < referenceDate; guard++) {
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      candidate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    if (rule.recurrence_end_date && candidate > rule.recurrence_end_date) return null;
    return candidate;
  }

  if (!rule.recurrence_days || rule.recurrence_days.length === 0) return null;
  const targetWeekdays = new Set(
    rule.recurrence_days
      .map((d) => RECURRENCE_WEEKDAYS.indexOf(d.toLowerCase() as (typeof RECURRENCE_WEEKDAYS)[number]))
      .filter((i) => i >= 0)
  );
  if (targetWeekdays.size === 0) return null;

  const anchorEpoch = toEpochDay(rule.date);
  const startEpoch = Math.max(anchorEpoch, toEpochDay(referenceDate));

  for (let epoch = startEpoch; epoch < startEpoch + 60; epoch++) {
    if (!targetWeekdays.has(weekdayOfEpochDay(epoch))) continue;
    if (rule.recurrence_frequency === "biweekly") {
      const weeksSinceAnchor = Math.floor((epoch - anchorEpoch) / 7);
      if (((weeksSinceAnchor % 2) + 2) % 2 !== 0) continue;
    }
    const candidate = fromEpochDay(epoch);
    if (rule.recurrence_end_date && candidate > rule.recurrence_end_date) return null;
    return candidate;
  }

  return null;
}

/** "Every Thursday" / "Every other Saturday" / "Monthly" style badge text. */
export function formatRecurrenceBadge(
  rule: Pick<RecurrenceRule, "is_recurring" | "recurrence_frequency" | "recurrence_days">
): string | null {
  if (!rule.is_recurring || !rule.recurrence_frequency) return null;

  if (rule.recurrence_frequency === "monthly") return "Monthly";

  if (!rule.recurrence_days || rule.recurrence_days.length === 0) return null;
  const dayLabel = rule.recurrence_days.map((d) => WEEKDAY_LABELS[d.toLowerCase()] ?? d).join(" & ");
  return rule.recurrence_frequency === "biweekly" ? `Every other ${dayLabel}` : `Every ${dayLabel}`;
}

/**
 * The date a recurring template (or plain one-off event) should actually be
 * treated as happening on: its own `date` for non-recurring events, or the
 * computed next occurrence for recurring ones. Returns null when a
 * recurring event's recurrence has ended and it should no longer show.
 */
export function getEffectiveDate(rule: RecurrenceRule, referenceDate: string = getCincyDateString()): string | null {
  if (!rule.is_recurring) return rule.date;
  return getNextOccurrence(rule, referenceDate);
}
