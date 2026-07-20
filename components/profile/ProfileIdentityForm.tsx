"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { uploadAvatar, updateProfileIdentity, formatIdentityName, initialsFromName } from "@/lib/supabase/identity";

interface Props {
  userId?: string | null;
  initialDisplayName?: string | null;
  initialAvatarUrl?: string | null;
  context?: "profile" | "onboarding";
  onSaved?: (args: { displayName: string; avatarUrl: string | null }) => void;
  onSkip?: () => void;
}

export default function ProfileIdentityForm({
  userId,
  initialDisplayName,
  initialAvatarUrl,
  context = "profile",
  onSaved,
  onSkip,
}: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayName(initialDisplayName ?? "");
    setAvatarUrl(initialAvatarUrl ?? null);
  }, [initialDisplayName, initialAvatarUrl]);

  async function handlePickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    setLoading(true);
    setError(null);

    const uploadedUrl = await uploadAvatar(userId, file);
    if (!uploadedUrl) {
      setError("We couldn't upload your photo.");
      setLoading(false);
      return;
    }

    setAvatarUrl(uploadedUrl);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      setError("Sign in first to save your identity.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await updateProfileIdentity(userId, {
      displayName: displayName.trim() || null,
      avatarUrl,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    setSaved(true);
    onSaved?.({ displayName: formatIdentityName(displayName, "Scout"), avatarUrl });
  }

  const title = context === "onboarding" ? "Add your name" : "Your identity";
  const subtitle =
    context === "onboarding"
      ? "This shows up on check-ins and helps people recognize you."
      : "Show up on check-ins with a name and photo.";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-card-border bg-white/[0.04] p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-card-border bg-accent/20 text-sm font-display font-bold text-accent"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Your avatar" className="h-full w-full object-cover" />
          ) : (
            <span>{initialsFromName(displayName)}</span>
          )}
        </button>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{title}</p>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePickPhoto}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Display name</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Scout"
          className="w-full rounded-xl border border-card-border bg-white/[0.06] px-3 py-3 text-sm text-white placeholder:text-muted/60 focus:outline-none focus:border-accent"
        />
      </label>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={loading || !userId}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Saving…" : saved ? "Saved" : context === "onboarding" ? "Continue" : "Save identity"}
        </button>
        {context === "onboarding" && onSkip && (
          <button type="button" onClick={onSkip} className="text-sm text-muted">
            Skip for now
          </button>
        )}
      </div>
    </form>
  );
}
