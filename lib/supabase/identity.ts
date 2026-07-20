import { compressImage } from "../imageCompression";
import { createClient } from "./client";

export interface ProfileIdentityPayload {
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface ProfileIdentityResult {
  profile: Record<string, unknown> | null;
  error: Error | null;
}

// Shape returned by the get_venue_checkins RPC (via /api/venues/checkins) —
// the DB is the source of truth for the "Scout" display-name fallback and the
// is_scout flag, so don't reshape or re-fallback these client-side.
export interface CheckedInTonightItem {
  checkin_id: string;
  display_name: string | null;
  avatar_url: string | null;
  checkin_type: string | null;
  crowd_level: string | null;
  created_at: string;
  is_scout: boolean;
}

export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  // compressImage always re-encodes to JPEG, so the object is always
  // {user}/profile.jpg — a fixed path we overwrite (upsert) rather than
  // accumulate a new file per upload, per the storage convention. The
  // owner-prefix RLS on the `avatars` bucket allows writes only under the
  // caller's own {auth_uid}/ folder, which this path satisfies.
  const { base64, mimeType } = await compressImage(file);
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const path = `${userId}/profile.jpg`;

  const supabase = createClient();
  const { error } = await supabase.storage.from("avatars").upload(path, bytes, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) {
    console.error("Avatar upload failed", error);
    return null;
  }

  // The public URL is identical across overwrites, so browsers would show the
  // old cached image — append a version param to force a refresh everywhere
  // this URL is rendered.
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl ? `${data.publicUrl}?v=${Date.now()}` : null;
}

export async function updateProfileIdentity(
  userId: string,
  updates: ProfileIdentityPayload
): Promise<ProfileIdentityResult> {
  const payload: Record<string, unknown> = {};
  if (updates.displayName !== undefined) payload.display_name = updates.displayName ?? null;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl ?? null;

  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      profile: null,
      error: new Error(data?.error || "Unable to save profile"),
    };
  }

  return {
    profile: data?.profile ?? null,
    error: null,
  };
}

export async function fetchCheckedInTonight(
  venueId: string,
  hoursBack = 2
): Promise<CheckedInTonightItem[]> {
  const response = await fetch(
    `/api/venues/checkins?venueId=${encodeURIComponent(venueId)}&hoursBack=${hoursBack}`
  );
  if (!response.ok) return [];

  const data = await response.json().catch(() => ({ checkins: [] }));
  return (data.checkins ?? []) as CheckedInTonightItem[];
}

export function formatIdentityName(displayName: string | null | undefined, fallback = "Scout") {
  const trimmed = displayName?.trim();
  return trimmed ? trimmed : fallback;
}

// Initials for the avatar fallback: first letter of the first and last word
// (e.g. "Courtney Davis" -> "CD", "Ken" -> "K"). Empty/"Scout" -> "S".
export function initialsFromName(displayName: string | null | undefined): string {
  const parts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function formatIdentityTimeLabel(checkedAt: Date, now = new Date()) {
  const diffMinutes = Math.max(0, Math.round((now.getTime() - checkedAt.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours} hr ago`;
}
