import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { VenueSearchResult } from "@/lib/checkin";

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

  const venues: VenueSearchResult[] = (data ?? []).map((v: { id: string; name: string; neighborhood: string | null; place_id: string | null }) => ({
    id: v.id,
    name: v.name,
    neighborhood: v.neighborhood,
    place_id: v.place_id,
  }));

  return NextResponse.json({ venues });
}
