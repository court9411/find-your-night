import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET: List pending events
async function GET(request: Request) {
  try {
    // Check auth
    const authHeader = request.headers.get("cookie");
    if (!authHeader?.includes("admin_authenticated=true")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("pending_events")
      .select("*")
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

// PATCH: Update event status
async function PATCH(request: Request) {
  try {
    // Check auth
    const authHeader = request.headers.get("cookie");
    if (!authHeader?.includes("admin_authenticated=true")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, status } = await request.json();

    if (!id || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("pending_events")
      .update({ status })
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
async function DELETE(request: Request) {
  try {
    // Check auth
    const authHeader = request.headers.get("cookie");
    if (!authHeader?.includes("admin_authenticated=true")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

export { GET, PATCH, DELETE };
