import { NightOrDay, GroupSize, AgeRange } from "@/lib/pickerMatch";

interface LogPickerSwipeParams {
  userId?: string | null;
  anonId?: string | null;
  venueId: string;
  nightOrDay: NightOrDay;
  groupSize: GroupSize;
  ageRange: AgeRange;
}

/** Fire-and-forget swipe-right signal. Never throws or blocks the UI. */
export function logPickerSwipe({ userId, anonId, venueId, nightOrDay, groupSize, ageRange }: LogPickerSwipeParams): void {
  fetch("/api/picker/swipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, anonId, venueId, nightOrDay, groupSize, ageRange }),
  }).catch((err) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("logPickerSwipe failed:", err);
    }
  });
}
