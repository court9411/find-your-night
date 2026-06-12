import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Returns today's date as YYYY-MM-DD, matching the `date` column's format.
export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Permanently removes pending_events whose date has already passed.
export async function deleteExpiredEvents(): Promise<void> {
  const { error } = await supabaseAdmin
    .from("pending_events")
    .delete()
    .lt("date", todayDateString());

  if (error) {
    console.error("Failed to delete expired events:", error);
  }
}
