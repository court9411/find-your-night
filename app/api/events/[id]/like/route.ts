import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_REQUESTS_PER_WINDOW = 30;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: { id: string };
}

export async function POST(request: Request, { params }: PageProps) {
  const ip = getClientIp(request);
  if (isRateLimited("like", ip, MAX_REQUESTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const eventId = params.id;
  if (!UUID_REGEX.test(eventId)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  let body: { anonId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const anonId = typeof body.anonId === "string" ? body.anonId.trim().slice(0, 100) : "";
  if (!anonId) {
    return NextResponse.json({ error: "anonId is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("increment_event_like", {
    p_event_id: eventId,
    p_anon_id: anonId,
  });

  if (error) {
    console.error("Like RPC error:", error);
    return NextResponse.json({ error: "Couldn't record like. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ likeCount: data });
}
