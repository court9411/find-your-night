import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

const MAX_REQUESTS_PER_WINDOW = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitize(value: string, maxLength: number): string {
  return value.trim().replace(/[<>]/g, "").slice(0, maxLength);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited("submit", ip, MAX_REQUESTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many submissions from this network. Please try again later." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const venueName = typeof body.venueName === "string" ? sanitize(body.venueName, 120) : "";
  const type = typeof body.type === "string" ? sanitize(body.type, 60) : "";
  const neighborhood = typeof body.neighborhood === "string" ? sanitize(body.neighborhood, 100) : "";
  const dateTime = typeof body.dateTime === "string" ? sanitize(body.dateTime, 100) : "";
  const description = typeof body.description === "string" ? sanitize(body.description, 1000) : "";
  const vibeTags = typeof body.vibeTags === "string" ? sanitize(body.vibeTags, 200) : "";
  const contactEmail = typeof body.contactEmail === "string" ? sanitize(body.contactEmail, 254) : "";

  if (!venueName || !type || !neighborhood || !dateTime || !description || !contactEmail) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
  }

  if (!EMAIL_REGEX.test(contactEmail)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const { error } = await supabase.from("submissions").insert({
    venue_name: venueName,
    type,
    neighborhood,
    date_time: dateTime,
    description,
    vibe_tags: vibeTags,
    contact_email: contactEmail,
    status: "pending",
  });

  if (error) {
    console.error("Submission insert error:", error);
    return NextResponse.json(
      { error: "Couldn't save your submission. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
