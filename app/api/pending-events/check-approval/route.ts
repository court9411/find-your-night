import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("pending_events")
      .select("id")
      .eq("submitter_email", email)
      .eq("status", "approved")
      .limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      hasApproved: data && data.length > 0,
    });
  } catch (error) {
    console.error("Check approval error:", error);
    return NextResponse.json(
      { error: "Failed to check approval status" },
      { status: 500 }
    );
  }
}
