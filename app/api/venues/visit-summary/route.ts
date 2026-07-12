import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { VisitRating, CrowdLevel, MusicQuality } from "@/lib/visitSurvey";

const MAX_NOTES = 2;

interface VisitRow {
  rating: VisitRating | null;
  crowd_level: CrowdLevel | null;
  music_quality: MusicQuality | null;
  would_return: boolean | null;
  surprise_note: string | null;
}

function mode<T extends string>(values: (T | null)[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) {
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: T | null = null;
  let bestCount = 0;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return best;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const venueId = url.searchParams.get("venueId");
  if (!venueId) return NextResponse.json({ error: "venueId is required" }, { status: 400 });

  // Aggregated across all users' post-visit surveys, so this must run under
  // supabaseAdmin (venue_visits RLS only lets a user read their own rows) —
  // only the aggregate is ever returned, never raw per-user rows.
  const { data, error } = await supabaseAdmin
    .from("venue_visits")
    .select("rating, crowd_level, music_quality, would_return, surprise_note")
    .eq("venue_id", venueId)
    .eq("attended", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as VisitRow[];
  if (rows.length === 0) {
    return NextResponse.json({ summary: null });
  }

  const ratings = rows.map((r) => r.rating).filter((r): r is VisitRating => r != null);
  const avgRating = ratings.length ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null;

  const returnVotes = rows.map((r) => r.would_return).filter((v): v is boolean => v != null);
  const wouldReturnPct = returnVotes.length
    ? Math.round((returnVotes.filter(Boolean).length / returnVotes.length) * 100)
    : null;

  const notes = rows
    .map((r) => r.surprise_note?.trim())
    .filter((n): n is string => !!n)
    .slice(-MAX_NOTES)
    .reverse();

  return NextResponse.json({
    summary: {
      visitCount: rows.length,
      avgRating,
      topCrowdLevel: mode(rows.map((r) => r.crowd_level)),
      topMusicQuality: mode(rows.map((r) => r.music_quality)),
      wouldReturnPct,
      notes,
    },
  });
}
