import { NextResponse } from "next/server";
import { runVenuePhotoSync } from "@/lib/venuePhotoSync";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runVenuePhotoSync();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("venue-photos cron error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
