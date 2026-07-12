import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET: List pending venue submissions
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("pending_venues")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get pending venues error:", error);
    return NextResponse.json({ error: "Failed to load pending venues" }, { status: 500 });
  }

  return NextResponse.json({ venues: data });
}

// PATCH: Approve (optionally setting opened_date) or reject a submission
export async function PATCH(request: Request) {
  let body: { id?: unknown; action?: unknown; openedDate?: unknown; rejectionReason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const action = body.action;
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Invalid id or action" }, { status: 400 });
  }

  if (action === "reject") {
    const rejectionReason = typeof body.rejectionReason === "string" ? body.rejectionReason : null;
    const { error } = await supabaseAdmin
      .from("pending_venues")
      .update({ status: "rejected", rejection_reason: rejectionReason, reviewed_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Reject pending venue error:", error);
      return NextResponse.json({ error: "Failed to reject venue" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // action === "approve"
  const { data: venueId, error: approveError } = await supabaseAdmin.rpc("approve_pending_venue", {
    p_id: id,
  });

  if (approveError) {
    console.error("Approve pending venue error:", approveError);
    return NextResponse.json({ error: "Failed to approve venue" }, { status: 500 });
  }

  const openedDate = typeof body.openedDate === "string" && body.openedDate ? body.openedDate : null;
  if (openedDate && venueId) {
    const { error: dateError } = await supabaseAdmin
      .from("venues")
      .update({ opened_date: openedDate })
      .eq("id", venueId);
    if (dateError) {
      console.error("Set opened_date error:", dateError);
      // Approval already succeeded — don't fail the whole request over the date.
    }
  }

  return NextResponse.json({ success: true, venueId });
}

// DELETE: Remove a submission outright (e.g. spam/duplicate)
export async function DELETE(request: Request) {
  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { error } = await supabaseAdmin.from("pending_venues").delete().eq("id", id);
  if (error) {
    console.error("Delete pending venue error:", error);
    return NextResponse.json({ error: "Failed to delete venue" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
