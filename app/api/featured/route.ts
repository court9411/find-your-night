import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { getSubmittedVenues } from "@/lib/featuredVenues";

const MAX_REQUESTS_PER_WINDOW = 30;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited("featured", ip, MAX_REQUESTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: { city?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const city = typeof body.city === "string" ? body.city.trim().slice(0, 100) : "";

  if (!city) {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }

  const venues = await getSubmittedVenues(city);

  return NextResponse.json({ venues });
}
