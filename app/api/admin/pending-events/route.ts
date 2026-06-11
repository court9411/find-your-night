import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET: List pending events
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("pending_events")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ events: data });
  } catch (error) {
    console.error("Get pending events error:", error);
    return NextResponse.json(
      { error: "Failed to load pending events" },
      { status: 500 }
    );
  }
}

// PATCH: Update event status, order, featured pin, or category
export async function PATCH(request: Request) {
  try {
    const { id, status, display_order, featured, category } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    if (status !== undefined && !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    if (status !== undefined) update.status = status;
    if (display_order !== undefined) update.display_order = display_order;
    if (featured !== undefined) update.featured = featured;
    if (category !== undefined) update.category = category;

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("pending_events")
      .update(update)
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update pending event error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// DELETE: Remove event
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("pending_events")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete pending event error:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
