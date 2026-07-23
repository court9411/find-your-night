import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  home_city: string | null;
  home_neighborhood: string | null;
  home_lat: number | null;
  home_lng: number | null;
  vibe_prefs: string[];
  music_prefs: string[];
  price_levels: number[];
  activity_interests: string[];
  anon_id: string | null;
  created_at: string;
  updated_at: string;
  is_scout: boolean;
  onboarding_completed_at: string | null;
}

export type ProfileUpdate = Partial<
  Pick<
    UserProfile,
    | "display_name"
    | "avatar_url"
    | "home_city"
    | "home_neighborhood"
    | "home_lat"
    | "home_lng"
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
