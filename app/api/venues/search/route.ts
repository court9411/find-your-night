import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CHECKINABLE_VENUE_CATEGORIES, VenueSearchResult } from "@/lib/checkin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  if (!q) return NextResponse.json({ venues: [] });

  const { data, error } = await supabaseAdmin.rpc("search_venues", {
    p_query: q,
    p_market_id: null,
    p_limit: 8,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as { id: string; name: string; neighborhood: string | null; place_id: string | null }[];

  // search_venues() (DB-owned RPC) doesn't return venue_category, so filter
  // daytime spots out here — a name search must not let someone check in at a
  // cafe/park with nightlife styling any more than the map or GPS match do.
  let allowedIds = new Set(rows.map((v) => v.id));
  if (rows.length > 0) {
    const { data: cats } = await supabaseAdmin
      .from("venues")
      .select("id, venue_category")
      .in("id", rows.map((v) => v.id));
    allowedIds = new Set(
      (cats ?? [])
        .filter((c) => CHECKINABLE_VENUE_CATEGORIES.includes(c.venue_category as string))
        .map((c) => c.id as string)
    );
  }

  const venues: VenueSearchResult[] = rows
    .filter((v) => allowedIds.has(v.id))
    .map((v) => ({
      id: v.id,
      name: v.name,
      neighborhood: v.neighborhood,
      place_id: v.place_id,
    }));

  return NextResponse.json({ venues });
}
