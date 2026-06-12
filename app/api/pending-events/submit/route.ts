import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ExtractedEventData } from "@/lib/types";

const resend = new Resend(process.env.RESEND_API_KEY || "placeholder-resend-key");

export async function POST(request: Request) {
  try {
    const { eventData, submitterEmail, imageUrl, isAutoApproved, category } = await request.json();

    if (!eventData || !submitterEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!eventData.city?.trim()) {
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("pending_events")
      .insert({
        event_name: eventData.eventName,
        date: eventData.date,
        start_time: eventData.startTime,
        venue_name: eventData.venueName,
        address: eventData.address,
        neighborhood: eventData.neighborhood || null,
        city: eventData.city.trim(),
        state: eventData.state || null,
        price: eventData.price,
        ticket_link: eventData.ticketLink,
        vibe_tags: eventData.vibeTags || [],
        image_url: imageUrl,
        submitter_email: submitterEmail,
        status: isAutoApproved ? "approved" : "pending",
        category: category || null,
        lat: eventData.lat ?? null,
        lng: eventData.lng ?? null,
        is_private_location: !!eventData.isPrivateLocation,
        private_location_note: eventData.isPrivateLocation
          ? eventData.privateLocationNote || null
          : null,
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    await sendNotificationEmail(eventData, submitterEmail, isAutoApproved);

    return NextResponse.json({
      success: true,
      id: data.id,
    });
  } catch (error) {
    console.error("Submit pending event error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to submit event",
      },
      { status: 500 }
    );
  }
}

async function sendNotificationEmail(
  eventData: ExtractedEventData,
  submitterEmail: string,
  isAutoApproved: boolean
) {
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
      subject: `New event submission: ${eventData.eventName ?? "Untitled event"}`,
      html: `
        <h2>New Event Submission: ${eventData.eventName ?? "Untitled event"}</h2>
        <p><strong>Date:</strong> ${eventData.date ?? "—"}</p>
        <p><strong>Start Time:</strong> ${eventData.startTime ?? "—"}</p>
        <p><strong>Venue:</strong> ${eventData.venueName ?? "—"}</p>
        <p><strong>Address:</strong> ${eventData.address ?? "—"}</p>
        <p><strong>Price:</strong> ${eventData.price ?? "—"}</p>
        <p><strong>Vibe Tags:</strong> ${eventData.vibeTags?.join(", ") || "—"}</p>
        <p><strong>Submitter Email:</strong> ${submitterEmail}</p>
        <p><strong>Status:</strong> ${isAutoApproved ? "Auto-approved" : "Pending review"}</p>
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
