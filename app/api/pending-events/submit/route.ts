import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { eventData, submitterEmail, imageUrl, isAutoApproved } = await request.json();

    if (!eventData || !submitterEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("pending_events")
      .insert({
        event_name: eventData.eventName,
        date: eventData.date,
        start_time: eventData.startTime,
        venue_name: eventData.venueName,
        address: eventData.address,
        price: eventData.price,
        ticket_link: eventData.ticketLink,
        vibe_tags: eventData.vibeTags || [],
        image_url: imageUrl,
        submitter_email: submitterEmail,
        status: isAutoApproved ? "approved" : "pending",
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

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
