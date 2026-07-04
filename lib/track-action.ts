export type TargetType = "event" | "venue";
export type ActionType =
  | "viewed"
  | "clicked"
  | "saved"
  | "shared"
  | "directions_clicked"
  | "hidden"
  | "quick_back"
  | "searched_similar";

interface LogActionParams {
  userId?: string | null;
  anonId?: string | null;
  targetType: TargetType;
  targetId: string;
  actionType: ActionType;
}

/** Fire-and-forget scoring signal. Never throws or blocks the UI. */
export function logAction({ userId, anonId, targetType, targetId, actionType }: LogActionParams): void {
  fetch("/api/track-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, anonId, targetType, targetId, actionType }),
  }).catch((err) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("logAction failed:", err);
    }
  });
}
