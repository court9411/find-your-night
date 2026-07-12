"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/imageCompression";
import { usePhotoCapture } from "@/lib/usePhotoCapture";
import { VENUE_CATEGORY_OPTIONS, PRICE_LEVEL_OPTIONS } from "@/lib/venueSubmission";
import { VALID_VIBE_TAGS } from "@/components/EventReviewForm";
import PlaceAutocompleteInput, { PlaceDetails } from "@/components/PlaceAutocompleteInput";
import PicksLink from "@/components/PicksLink";

interface FormState {
  name: string;
  address: string;
  neighborhood: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  venueCategory: string;
  priceLevel: number | null;
  vibeTags: string[];
  description: string;
}

const BLANK_FORM: FormState = {
  name: "",
  address: "",
  neighborhood: "",
  lat: null,
  lng: null,
  placeId: null,
  venueCategory: "",
  priceLevel: null,
  vibeTags: [],
  description: "",
};

type Stage = "form" | "success";

export default function SubmitVenuePage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [stage, setStage] = useState<Stage>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const photo = usePhotoCapture();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      setIsAuthed(!!user);
      setAuthChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handlePlaceSelected(place: PlaceDetails) {
    setForm((prev) => ({
      ...prev,
      name: place.name || prev.name,
      address: place.address || prev.address,
      neighborhood: place.neighborhood || prev.neighborhood,
      lat: place.lat,
      lng: place.lng,
    }));
  }

  function toggleVibeTag(tag: string) {
    setForm((prev) => {
      const has = prev.vibeTags.includes(tag);
      const next = has ? prev.vibeTags.filter((t) => t !== tag) : [...prev.vibeTags, tag].slice(0, 4);
      return { ...prev, vibeTags: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.lat == null || form.lng == null) {
      setError("Search for the venue above so we can pin its location.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let photoPayload: { base64: string; mimeType: string } | null = null;
      if (photo.file) {
        photoPayload = await compressImage(photo.file);
      }

      const res = await fetch("/api/venues/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address || null,
          lat: form.lat,
          lng: form.lng,
          neighborhood: form.neighborhood || null,
          venueCategory: form.venueCategory || null,
          vibeTags: form.vibeTags,
          priceLevel: form.priceLevel,
          description: form.description || null,
          photo: photoPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setStage("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit venue");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authChecked) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-6 text-center">
        <span className="text-5xl">📍</span>
        <h1 className="font-display font-extrabold text-4xl tracking-tight">Add a Venue</h1>
        <p className="text-muted text-sm max-w-xs">
          Sign in to add a venue — this keeps submissions tied to a real account instead of an email field.
        </p>
        <Link
          href="/login"
          className="w-full max-w-xs rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide py-3.5 text-center"
        >
          Sign In
        </Link>
        <PicksLink className="text-sm text-muted underline underline-offset-4">
          Home
        </PicksLink>
      </main>
    );
  }

  if (stage === "success") {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-6 text-center">
        <span className="text-6xl">📬</span>
        <h1 className="font-display font-extrabold text-4xl tracking-tight">Pending Review</h1>
        <p className="text-muted max-w-sm">
          Thanks for adding a spot! We&apos;ll review it and add it to the map within 24 hours.
        </p>
        <button
          onClick={() => {
            setForm(BLANK_FORM);
            photo.clear();
            setStage("form");
          }}
          className="rounded-2xl bg-accent/20 border-2 border-accent text-accent font-display text-lg tracking-wide px-8 py-3 transition-all hover:bg-accent/30"
        >
          Add Another
        </button>
        <PicksLink className="rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-lg tracking-wide px-8 py-3 transition-transform active:scale-95">
          Back Home
        </PicksLink>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-screen px-6 py-12 gap-8">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <h1 className="font-display font-extrabold text-4xl tracking-tight">Add a Venue</h1>
        <PicksLink className="text-sm text-muted underline underline-offset-4">
          Home
        </PicksLink>
      </div>

      <p className="text-muted text-sm w-full max-w-2xl -mt-4">
        Know a spot that&apos;s missing? Add it and we&apos;ll get it on the map.
      </p>

      {error && (
        <div className="glass-card w-full max-w-2xl px-5 py-3 border border-red-500/30 bg-red-900/10">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card w-full max-w-2xl px-6 py-6 flex flex-col gap-4">
        <div>
          <label className="text-xs text-muted mb-1 block">Venue Name</label>
          <PlaceAutocompleteInput
            value={form.name}
            onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
            onPlaceSelected={handlePlaceSelected}
            placeholder="Start typing a venue..."
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60"
          />
          {form.neighborhood && <p className="text-xs text-muted mt-1">{form.neighborhood}</p>}
          {!form.lat && (
            <p className="text-xs text-muted/60 mt-1">
              Pick a result from the search dropdown so we get the exact location.
            </p>
          )}
        </div>

        <div>
          <label className="text-xs text-muted mb-1 block">Address</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted mb-1 block">Category</label>
            <select
              value={form.venueCategory}
              onChange={(e) => setForm((prev) => ({ ...prev, venueCategory: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60 text-base text-white [color-scheme:dark]"
            >
              <option value="">Select category</option>
              {VENUE_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Price</label>
            <div className="flex gap-2">
              {PRICE_LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      priceLevel: prev.priceLevel === opt.value ? null : opt.value,
                    }))
                  }
                  className={`flex-1 py-2 rounded-lg text-sm font-display font-bold transition-all ${
                    form.priceLevel === opt.value
                      ? "bg-accent text-black"
                      : "bg-white/5 border border-white/10 text-muted hover:border-accent/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted mb-2 block">Vibe Tags</label>
          <div className="flex flex-wrap gap-2">
            {VALID_VIBE_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleVibeTag(tag)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  form.vibeTags.includes(tag)
                    ? "bg-accent text-black"
                    : "bg-white/5 border border-white/10 text-muted hover:border-accent/60"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted mb-1 block">
            Description <span className="text-muted/60">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60 min-h-24 resize-none"
            maxLength={1000}
          />
        </div>

        <div>
          <label className="text-xs text-muted mb-2 block">
            Photo <span className="text-muted/60">(optional)</span>
          </label>
          <input {...photo.inputProps} />
          {photo.previewUrl ? (
            <div className="relative w-32 h-32">
              <img
                src={photo.previewUrl}
                alt="Venue preview"
                className="w-32 h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={photo.clear}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/80 text-white text-xs flex items-center justify-center"
                aria-label="Remove photo"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={photo.open}
              className="rounded-xl border-2 border-white/10 text-muted text-sm px-4 py-3 hover:border-accent/60 transition-all"
            >
              📷 Add a photo
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-lg tracking-wide px-6 py-3 transition-transform active:scale-95 disabled:opacity-50 mt-2"
        >
          {submitting ? "Submitting..." : "Submit Venue"}
        </button>
      </form>
    </main>
  );
}
