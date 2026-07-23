import { NightOrDay, GroupSize } from "@/lib/pickerMatch";

interface LogPickerSwipeParams {
  userId?: string | null;
  anonId?: string | null;
  venueId: string;
  direction: "left" | "right";
  nightOrDay: NightOrDay;
  groupSize: GroupSize;
}

/** Fire-and-forget swipe signal (either direction). Never throws or blocks the UI. */
export function logPickerSwipe({ userId, anonId, venueId, direction, nightOrDay, groupSize }: LogPickerSwipeParams): void {
  fetch("/api/picker/swipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, anonId, venueId, direction, nightOrDay, groupSize }),
  }).catch((err) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("logPickerSwipe failed:", err);
    }
  });
}
