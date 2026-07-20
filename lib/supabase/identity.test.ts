import { describe, expect, it } from "vitest";
import { formatIdentityName, formatIdentityTimeLabel } from "./identity";

describe("identity helpers", () => {
  it("falls back to a friendly display name", () => {
    expect(formatIdentityName("  ", "Scout")).toBe("Scout");
    expect(formatIdentityName("Courtney", "Scout")).toBe("Courtney");
  });

  it("formats recent check-in times", () => {
    const now = new Date("2026-07-18T12:00:00.000Z");
    expect(formatIdentityTimeLabel(new Date("2026-07-18T11:59:00.000Z"), now)).toBe("1 min ago");
    expect(formatIdentityTimeLabel(new Date("2026-07-18T11:40:00.000Z"), now)).toBe("20 min ago");
    expect(formatIdentityTimeLabel(new Date("2026-07-18T11:00:00.000Z"), now)).toBe("1 hr ago");
  });
});
