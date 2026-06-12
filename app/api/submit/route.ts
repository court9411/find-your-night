import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

const resend = new Resend(process.env.RESEND_API_KEY || "placeholder-resend-key");

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
  const city = typeof body.city === "string" ? sanitize(body.city, 100) : "";
  const state = typeof body.state === "string" ? sanitize(body.state, 10) : "";
  const dateTime = typeof body.dateTime === "string" ? sanitize(body.dateTime, 100) : "";
  const description = typeof body.description === "string" ? sanitize(body.description, 1000) : "";
  const vibeTags = typeof body.vibeTags === "string" ? sanitize(body.vibeTags, 200) : "";
  const contactEmail = typeof body.contactEmail === "string" ? sanitize(body.contactEmail, 254) : "";
  const lat = typeof body.lat === "number" && Number.isFinite(body.lat) ? body.lat : null;
  const lng = typeof body.lng === "number" && Number.isFinite(body.lng) ? body.lng : null;

  if (!venueName || !type || !neighborhood || !city || !dateTime || !description || !contactEmail) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
  }

  if (!EMAIL_REGEX.test(contactEmail)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const { error } = await supabase.from("submissions").insert({
    venue_name: venueName,
    type,
    neighborhood,
    city,
    state: state || null,
    date_time: dateTime,
    description,
    vibe_tags: vibeTags,
    contact_email: contactEmail,
    status: "pending",
    lat,
    lng,
  });

  if (error) {
    console.error("Submission insert error:", error);
    return NextResponse.json(
      { error: "Couldn't save your submission. Please try again." },
      { status: 500 }
    );
  }

  await sendNotificationEmail({
    venueName,
    type,
    neighborhood,
    city,
    dateTime,
    description,
    vibeTags,
    contactEmail,
  });

  return NextResponse.json({ success: true });
}

interface NotificationDetails {
  venueName: string;
  type: string;
  neighborhood: string;
  city: string;
  dateTime: string;
  description: string;
  vibeTags: string;
  contactEmail: string;
}

async function sendNotificationEmail(details: NotificationDetails) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!apiKey) {
    console.error("Notification email skipped: RESEND_API_KEY is not set");
    return;
  }
  if (!adminEmail) {
    console.error("Notification email skipped: ADMIN_NOTIFICATION_EMAIL is not set");
    return;
  }

  const adminUrl = `${siteUrl}/admin`;

  try {
    const { data, error } = await resend.emails.send({
      from: `Find Your Night <${fromEmail}>`,
      to: adminEmail,
      subject: `New submission: ${details.venueName}`,
      html: `
        <h2>New Submission: ${details.venueName}</h2>
        <p><strong>Type:</strong> ${details.type}</p>
        <p><strong>Neighborhood:</strong> ${details.neighborhood}</p>
        <p><strong>City:</strong> ${details.city}</p>
        <p><strong>Date & Time:</strong> ${details.dateTime}</p>
        <p><strong>Description:</strong> ${details.description}</p>
        <p><strong>Vibe Tags:</strong> ${details.vibeTags || "—"}</p>
        <p><strong>Contact Email:</strong> ${details.contactEmail}</p>
        <p><a href="${adminUrl}">Review in Admin Panel</a></p>
      `,
    });

    if (error) {
      console.error("Notification email error (Resend API):", error);
    } else {
      console.log("Notification email sent:", data?.id);
    }
  } catch (err) {
    console.error("Notification email error (exception):", err);
  }
}
