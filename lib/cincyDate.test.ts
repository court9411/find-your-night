import { describe, expect, it } from "vitest";
import { getNightlifeContext } from "./cincyDate";

// Friday, July 10, 2026 is EDT (UTC-4). Thursday July 9 precedes it.
const EDT_OFFSET_HOURS = 4;

function nyTime(isoDatePart: string, hour: number, minute = 0): Date {
  const utcHour = hour + EDT_OFFSET_HOURS;
  return new Date(`${isoDatePart}T${String(utcHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
}

describe("getNightlifeContext", () => {
  it("treats 3:00am as still nightlife, belonging to the previous day", () => {
    const ctx = getNightlifeContext(nyTime("2026-07-10", 3, 0));
    expect(ctx.mode).toBe("nightlife");
    expect(ctx.dayOfWeek).toBe("thursday");
  });

  it("treats 3:59am as still nightlife, belonging to the previous day", () => {
    const ctx = getNightlifeContext(nyTime("2026-07-10", 3, 59));
    expect(ctx.mode).toBe("nightlife");
    expect(ctx.dayOfWeek).toBe("thursday");
  });

  it("flips to daytime at exactly 4:00am, on the new calendar day", () => {
    const ctx = getNightlifeContext(nyTime("2026-07-10", 4, 0));
    expect(ctx.mode).toBe("daytime");
    expect(ctx.dayOfWeek).toBe("friday");
  });

  it("stays daytime at 3:59pm", () => {
    const ctx = getNightlifeContext(nyTime("2026-07-10", 15, 59));
    expect(ctx.mode).toBe("daytime");
    expect(ctx.dayOfWeek).toBe("friday");
  });

  it("flips to nightlife at exactly 4:00pm, same calendar day", () => {
    const ctx = getNightlifeContext(nyTime("2026-07-10", 16, 0));
    expect(ctx.mode).toBe("nightlife");
    expect(ctx.dayOfWeek).toBe("friday");
  });

  it("stays on the same night's dayOfWeek right up to the 4am rollover", () => {
    const ctx = getNightlifeContext(nyTime("2026-07-11", 0, 30)); // 12:30am Saturday
    expect(ctx.mode).toBe("nightlife");
    expect(ctx.dayOfWeek).toBe("friday");
  });
});
