import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { storeVisitPhoto } from "@/lib/visitPhotoStorage";

interface VisitSubmitBody {
  eventId: string;
  venueId?: string | null;
  attended: boolean;
  rating?: number;
  crowdLevel?: string;
  musicQuality?: string;
  priceSentiment?: string;
  wouldReturn?: boolean;
  surpriseNote?: string;
  photo?: { base64: string; mimeType: string };
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: VisitSubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.eventId || typeof body.attended !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  let photoUrl: string | null = null;
  if (body.attended && body.photo) {
    photoUrl = await storeVisitPhoto(body.photo.base64, body.photo.mimeType);
  }

  const { error } = await supabaseAdmin.from("venue_visits").insert({
    user_id: user.id,
    event_id: body.eventId,
    venue_id: body.venueId ?? null,
    prompted_from: "saved_event",
    attended: body.attended,
    rating: body.attended ? body.rating ?? null : null,
    crowd_level: body.attended ? body.crowdLevel ?? null : null,
    music_quality: body.attended ? body.musicQuality ?? null : null,
    price_sentiment: body.attended ? body.priceSentiment ?? null : null,
    would_return: body.attended ? body.wouldReturn ?? null : null,
    photo_url: photoUrl,
    surprise_note: body.attended ? body.surpriseNote?.trim() || null : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
