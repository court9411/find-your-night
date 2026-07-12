import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { storeVenueSubmissionPhoto } from "@/lib/venuePhotoStorage";
import { VENUE_CATEGORY_OPTIONS } from "@/lib/venueSubmission";

interface VenueSubmitBody {
  name?: string;
  address?: string | null;
  lat?: number;
  lng?: number;
  neighborhood?: string | null;
  placeId?: string | null;
  venueCategory?: string | null;
  vibeTags?: string[];
  priceLevel?: number | null;
  description?: string | null;
  photo?: { base64: string; mimeType: string } | null;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: VenueSubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name || !Number.isFinite(body.lat) || !Number.isFinite(body.lng)) {
    return NextResponse.json({ error: "Venue name and location are required" }, { status: 400 });
  }
  if (body.venueCategory && !VENUE_CATEGORY_OPTIONS.some((o) => o.value === body.venueCategory)) {
    return NextResponse.json({ error: "Invalid venue category" }, { status: 400 });
  }
  if (body.priceLevel != null && (body.priceLevel < 1 || body.priceLevel > 4)) {
    return NextResponse.json({ error: "Invalid price level" }, { status: 400 });
  }

  const lat = body.lat as number;
  const lng = body.lng as number;

  const { data: marketId } = await supabaseAdmin.rpc("resolve_market_id", {
    p_venue_id: null,
    p_lat: lat,
    p_lng: lng,
  });

  let imageUrl: string | null = null;
  if (body.photo?.base64 && body.photo?.mimeType) {
    imageUrl = await storeVenueSubmissionPhoto(body.photo.base64, body.photo.mimeType);
  }

  const { data: inserted, error } = await supabase
    .from("pending_venues")
    .insert({
      submitted_by: user.id,
      name,
      address: body.address ?? null,
      lat,
      lng,
      neighborhood: body.neighborhood ?? null,
      venue_category: body.venueCategory ?? null,
      vibe_tags: body.vibeTags ?? [],
      price_level: body.priceLevel ?? null,
      description: body.description ?? null,
      image_url: imageUrl,
      place_id: body.placeId ?? null,
      market_id: marketId ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Venue submission error:", error);
    return NextResponse.json({ error: "Failed to submit venue" }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id });
}
