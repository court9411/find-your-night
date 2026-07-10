import { SupabaseClient } from "@supabase/supabase-js";

export interface VenueLiveEventRow {
  event_id: string;
  event_name: string;
  description: string | null;
  vibe_tags: string[] | null;
  start_dt: string;
  end_dt: string;
  image_url: string | null;
  ticket_link: string | null;
}

/** Rows are already ordered soonest-first and filtered to still-live/upcoming by the RPC. */
export async function fetchVenueLiveEvents(
  supabaseAdmin: SupabaseClient,
  venueId: string
): Promise<VenueLiveEventRow[]> {
  const { data, error } = await supabaseAdmin.rpc("get_venue_live_events", { p_venue_id: venueId });
  if (error) {
    console.error("get_venue_live_events RPC error:", error);
    return [];
  }
  return (data ?? []) as VenueLiveEventRow[];
}
