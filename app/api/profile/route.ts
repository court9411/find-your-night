import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, upsertUserProfile, ProfileUpdate } from "@/lib/userProfile";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getUserProfile(user.id);
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ProfileUpdate;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Only allow known fields
  const allowed: (keyof ProfileUpdate)[] = [
    "home_city",
    "home_neighborhood",
    "home_lat",
    "home_lng",
    "vibe_prefs",
    "music_prefs",
    "price_levels",
    "activity_interests",
    "anon_id",
  ];
  const update: ProfileUpdate = {};
  for (const key of allowed) {
    if (key in body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (update as any)[key] = (body as any)[key];
    }
  }

  const profile = await upsertUserProfile(user.id, update);
  if (!profile) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
