import { describe, expect, it } from "vitest";
import { isEventOver } from "./eventTiming";

// Friday, July 10, 2026 is EDT (UTC-4). Thursday July 9 precedes it.
const EDT_OFFSET_HOURS = 4;

function nyTime(isoDatePart: string, hour: number, minute = 0): Date {
  const [y, m, d] = isoDatePart.split("-").map(Number);
  // Date.UTC auto-normalizes an overflowing hour (e.g. 23 + 4 = 27) into the
  // next UTC day, which is exactly the correct behavior here.
  return new Date(Date.UTC(y, m - 1, d, hour + EDT_OFFSET_HOURS, minute, 0));
}

describe("isEventOver — no end_time (4am rollover fallback)", () => {
  it("is not over at 11pm the same night", () => {
    const over = isEventOver({ date: "2026-07-09", end_time: null }, nyTime("2026-07-09", 23, 0));
    expect(over).toBe(false);
  });

  it("is not over at 3:59am the following morning (still rolled into last night)", () => {
    const over = isEventOver({ date: "2026-07-09", end_time: null }, nyTime("2026-07-10", 3, 59));
    expect(over).toBe(false);
  });

  it("is over at exactly 4:00am the following morning", () => {
    const over = isEventOver({ date: "2026-07-09", end_time: null }, nyTime("2026-07-10", 4, 0));
    expect(over).toBe(true);
  });

  it("is over for a date further in the past regardless of current hour", () => {
    const over = isEventOver({ date: "2025-07-08", end_time: null }, nyTime("2026-07-09", 1, 0));
    expect(over).toBe(true);
  });
});

describe("isEventOver — explicit end_time (real timestamp comparison)", () => {
  it("is not over before the stated end time", () => {
    const over = isEventOver({ date: "2026-07-09", end_time: "9:00 PM" }, nyTime("2026-07-09", 20, 30));
    expect(over).toBe(false);
  });

  it("is over right after the stated end time, even well before 4am rollover would apply", () => {
    const over = isEventOver({ date: "2026-07-09", end_time: "9:00 PM" }, nyTime("2026-07-09", 21, 1));
    expect(over).toBe(true);
  });

  it("is not over at exactly the end time (strictly-after semantics)", () => {
    const over = isEventOver({ date: "2026-07-09", end_time: "9:00 PM" }, nyTime("2026-07-09", 21, 0));
    expect(over).toBe(false);
  });

  it("handles 24-hour time strings", () => {
    const over = isEventOver({ date: "2026-07-09", end_time: "21:00" }, nyTime("2026-07-09", 21, 1));
    expect(over).toBe(true);
  });

  it("falls back to the rollover heuristic when end_time is unparseable", () => {
    const over = isEventOver({ date: "2026-07-09", end_time: "garbage" }, nyTime("2026-07-10", 3, 59));
    expect(over).toBe(false);
  });
});
