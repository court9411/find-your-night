import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUSES = ["pending", "approved", "rejected"];

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin submissions fetch error:", error);
    return NextResponse.json({ error: "Failed to load submissions" }, { status: 500 });
  }

  return NextResponse.json({ submissions: data });
}

export async function PATCH(request: Request) {
  let body: { id?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";

  if (!id || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid id or status" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("submissions").update({ status }).eq("id", id);

  if (error) {
    console.error("Admin submissions update error:", error);
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";

  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("submissions").delete().eq("id", id);

  if (error) {
    console.error("Admin submissions delete error:", error);
    return NextResponse.json({ error: "Failed to delete submission" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
