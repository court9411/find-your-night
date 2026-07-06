import { NextResponse } from "next/server";
import { runVenueHoursSync } from "@/lib/venueHoursSync";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runVenueHoursSync();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("venue-hours cron error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
