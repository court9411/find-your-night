import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface UserProfile {
  id: string;
  email: string | null;
  home_city: string | null;
  home_neighborhood: string | null;
  vibe_prefs: string[];
  music_prefs: string[];
  price_levels: number[];
  activity_interests: string[];
  anon_id: string | null;
  created_at: string;
  updated_at: string;
  is_scout: boolean;
}

export type ProfileUpdate = Partial<
  Pick<
    UserProfile,
    | "home_city"
    | "home_neighborhood"
    | "vibe_prefs"
    | "music_prefs"
    | "price_levels"
    | "activity_interests"
    | "anon_id"
  >
>;

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function upsertUserProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      { id: userId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}
