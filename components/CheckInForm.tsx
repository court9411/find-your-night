"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useLocation } from "@/lib/useLocation";
import { usePhotoCapture } from "@/lib/usePhotoCapture";
import { compressImage } from "@/lib/imageCompression";
import { CROWD_LEVEL_OPTIONS, CHECKIN_MUSIC_TAGS, CrowdLevel, ScoutStats, SelectedVenue } from "@/lib/checkin";
import SaveAuthModal from "@/components/SaveAuthModal";
import ScoutTierSummary from "@/components/ScoutTierSummary";

interface Props {
  venue: SelectedVenue;
  onBack: () => void;
  onSubmitted: () => void;
}

export default function CheckInForm({ venue, onBack, onSubmitted }: Props) {
  const location = useLocation();
  const photo = usePhotoCapture();

  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<ScoutStats | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [crowdLevel, setCrowdLevel] = useState<CrowdLevel | null>(null);
  const [musicTags, setMusicTags] = useState<string[]>([]);
  const [waitMinutes, setWaitMinutes] = useState("");
  const [coverAmount, setCoverAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);
      if (!user) return;
      try {
        const res = await fetch("/api/checkins/stats");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch {}
    }
    init();
    return () => { cancelled = true; };
  }, []);

  function toggleMusicTag(tag: string) {
    setMusicTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function doSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const coords = await location.request();

      let photoPayload: { base64: string; mimeType: string } | undefined;
      if (photo.file) {
        const { base64, mimeType } = await compressImage(photo.file);
        photoPayload = { base64, mimeType };
      }

      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: venue.id,
          crowdLevel,
          waitMinutes: waitMinutes.trim() ? Number(waitMinutes) : null,
          coverAmount: coverAmount.trim() ? Number(coverAmount) : null,
          musicTags,
          checkinLat: coords.lat,
          checkinLng: coords.lng,
          photo: photoPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");

      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit() {
    if (submitting) return;
    if (!userId) {
      setShowAuthModal(true);
      return;
    }
    doSubmit();
  }

  function handleAuthed(user: User) {
    setUserId(user.id);
    setShowAuthModal(false);
    doSubmit();
  }

  return (
    <div className="flex flex-col gap-6 px-5 pb-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-muted text-sm active:opacity-70">
          ← Back
        </button>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted/60 mb-1">Checking in at</p>
        <h2 className="font-display font-extrabold text-2xl tracking-tight">{venue.name}</h2>
      </div>

      {stats && <ScoutTierSummary stats={stats} />}

      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted font-semibold uppercase tracking-wider">Crowd</p>
        <div className="flex flex-wrap gap-2">
          {CROWD_LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCrowdLevel(opt.value)}
              className={`min-h-[44px] px-4 rounded-full font-display font-bold text-sm tracking-wide transition-all active:scale-95 ${
                crowdLevel === opt.value
                  ? "bg-accent text-black"
                  : "bg-white/[0.04] border border-card-border text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted font-semibold uppercase tracking-wider">Music</p>
        <div className="flex flex-wrap gap-2">
          {CHECKIN_MUSIC_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleMusicTag(tag)}
              className={`min-h-[44px] px-4 rounded-full font-display font-bold text-sm tracking-wide transition-all active:scale-95 ${
                musicTags.includes(tag)
                  ? "bg-accent text-black"
                  : "bg-white/[0.04] border border-card-border text-white"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-2">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">Wait (min)</p>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={waitMinutes}
            onChange={(e) => setWaitMinutes(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-2xl bg-white/[0.06] border border-card-border px-4 py-3 text-sm placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">Cover ($)</p>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={coverAmount}
            onChange={(e) => setCoverAmount(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-2xl bg-white/[0.06] border border-card-border px-4 py-3 text-sm placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted font-semibold uppercase tracking-wider">Add a photo (optional)</p>
        <input {...photo.inputProps} />
        {photo.previewUrl ? (
          <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-black/20">
            <img src={photo.previewUrl} alt="" className="w-full h-full object-contain" />
            <button
              onClick={photo.clear}
              aria-label="Remove photo"
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-white active:opacity-70"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={photo.open}
            className="w-full min-h-[52px] rounded-2xl border-2 border-dashed border-card-border text-muted text-sm font-semibold flex items-center justify-center gap-2 active:opacity-70"
          >
            <span aria-hidden>📷</span> Take or upload a photo
          </button>
        )}
      </div>

      {(error || location.error) && (
        <p className="text-sm text-accent">{error || location.error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full min-h-[52px] rounded-full bg-accent hover:bg-accent-hover text-black font-display font-bold text-lg tracking-wide py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {submitting ? "Checking in…" : "Check In"}
      </button>

      {showAuthModal && (
        <SaveAuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthed={handleAuthed}
          title="Enter your email to check in"
          subtitle="We'll send a 6-digit code. No password needed — this is what builds your Scout tier."
        />
      )}
    </div>
  );
}
