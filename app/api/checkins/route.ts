import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { storeVisitPhoto } from "@/lib/visitPhotoStorage";
import { haversineMeters } from "@/lib/geo";
import { CROWD_LEVEL_OPTIONS, CrowdLevel } from "@/lib/checkin";

// Mirrors the RLS policy on venue_checkins (75m proximity, 20min rate
// limit per venue) so we can surface a specific, friendly error instead of
// a raw policy-violation message. The actual insert still goes through the
// user-scoped client below so RLS enforces both for real, defense-in-depth.
const CHECKIN_RADIUS_METERS = 75;
const RATE_LIMIT_MINUTES = 20;

interface CheckInBody {
  venueId?: string;
  crowdLevel?: CrowdLevel | null;
  waitMinutes?: number | null;
  coverAmount?: number | null;
  musicTags?: string[];
  checkinLat?: number;
  checkinLng?: number;
  photo?: { base64: string; mimeType: string } | null;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: CheckInBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.venueId || !Number.isFinite(body.checkinLat) || !Number.isFinite(body.checkinLng)) {
    return NextResponse.json({ error: "Missing location or venue" }, { status: 400 });
  }
  if (body.crowdLevel && !CROWD_LEVEL_OPTIONS.some((o) => o.value === body.crowdLevel)) {
    return NextResponse.json({ error: "Invalid crowd level" }, { status: 400 });
  }

  const checkinLat = body.checkinLat as number;
  const checkinLng = body.checkinLng as number;

  const { data: venue, error: venueError } = await supabaseAdmin
    .from("venues")
    .select("id, lat, lng")
    .eq("id", body.venueId)
    .single();

  if (venueError || !venue || venue.lat == null || venue.lng == null) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  const distance = haversineMeters(
    { lat: checkinLat, lng: checkinLng },
    { lat: venue.lat, lng: venue.lng }
  );
  if (distance > CHECKIN_RADIUS_METERS) {
    return NextResponse.json({ error: "You need to be at the venue to check in." }, { status: 403 });
  }

  const rateLimitSince = new Date(Date.now() - RATE_LIMIT_MINUTES * 60000).toISOString();
  const { data: recentCheckin } = await supabaseAdmin
    .from("venue_checkins")
    .select("id")
    .eq("user_id", user.id)
    .eq("venue_id", body.venueId)
    .gt("created_at", rateLimitSince)
    .limit(1)
    .maybeSingle();

  if (recentCheckin) {
    return NextResponse.json(
      { error: "You already checked in here recently — try again in a bit." },
      { status: 429 }
    );
  }

  let photoUrl: string | null = null;
  if (body.photo) {
    photoUrl = await storeVisitPhoto(body.photo.base64, body.photo.mimeType);
  }

  const { error: insertError } = await supabase.from("venue_checkins").insert({
    user_id: user.id,
    venue_id: body.venueId,
    checkin_type: "scout",
    crowd_level: body.crowdLevel || null,
    wait_minutes: body.waitMinutes ?? null,
    cover_amount: body.coverAmount ?? null,
    music_tags: body.musicTags && body.musicTags.length > 0 ? body.musicTags : null,
    checkin_lat: checkinLat,
    checkin_lng: checkinLng,
    photo_url: photoUrl,
  });

  if (insertError) {
    const isRlsViolation = /row-level security/i.test(insertError.message);
    return NextResponse.json(
      {
        error: isRlsViolation
          ? "You need to be at the venue to check in, or you already checked in recently."
          : insertError.message,
      },
      { status: isRlsViolation ? 403 : 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
