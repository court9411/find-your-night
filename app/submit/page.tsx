"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ExtractedEventData } from "@/lib/types";
import PlaceAutocompleteInput, { PlaceDetails } from "@/components/PlaceAutocompleteInput";
import { EVENT_CATEGORIES } from "@/lib/vibeCategories";

type Mode = "smart" | "manual";

interface Stage {
  type: "input" | "extracting" | "preview" | "success";
}

interface ConfirmationData {
  isAutoApproved: boolean;
  shareUrl: string;
  eventName: string;
}

interface VenueSuggestion {
  venue_name: string;
  type: string;
  neighborhood: string;
}

const VALID_VIBE_TAGS = [
  "drag show",
  "live music",
  "dance party",
  "chill",
  "rooftop",
  "comedy",
  "art",
  "sports",
  "food",
  "networking",
];

const VIBE_OPTIONS = [
  "Drinks & Bars",
  "Live Music",
  "Night Out",
  "Late Night Eats",
  "Rooftop Vibes",
  "Casual Fun",
  "Arts & Events",
  "Pride",
];

const TIME_OPTIONS = (() => {
  const times: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const period = hour24 < 12 ? "AM" : "PM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    times.push(`${hour12}:${minute.toString().padStart(2, "0")} ${period}`);
  }
  return times;
})();

export default function SubmitPage() {
  const [mode, setMode] = useState<Mode>("smart");

  return mode === "manual" ? (
    <ManualSubmitForm onSwitchToSmart={() => setMode("smart")} />
  ) : (
    <SmartSubmitFlow onSwitchToManual={() => setMode("manual")} />
  );
}

function SmartSubmitFlow({ onSwitchToManual }: { onSwitchToManual: () => void }) {
  const [stage, setStage] = useState<Stage>({ type: "input" });
  const [extracted, setExtracted] = useState<ExtractedEventData | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);
  const [editedData, setEditedData] = useState<ExtractedEventData | null>(null);
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Required fields check
  function getMissingFields(): string[] {
    const data = editedData || extracted;
    if (!data) return [];
    const missing: string[] = [];
    if (!data.eventName?.trim()) missing.push("eventName");
    if (!data.date?.trim()) missing.push("date");
    if (!data.venueName?.trim()) missing.push("venueName");
    return missing;
  }

  async function handleExtract(url: string, imageBase64?: string, mimeType?: string) {
    setStage({ type: "extracting" });
    setError("");

    try {
      const payload = imageBase64
        ? { image: imageBase64, mimeType }
        : { url };

      const res = await fetch("/api/extract-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Extraction failed");
      }

      setExtracted(data.eventData);
      setEditedData(data.eventData);
      setImageUrl(data.ogImage);
      setStage({ type: "preview" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract event data"
      );
      setStage({ type: "input" });
    }
  }

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).elements.namedItem(
      "urlInput"
    ) as HTMLInputElement;
    const url = input.value.trim();

    if (!url) {
      setError("Please enter a URL");
      return;
    }

    handleExtract(url);
  }

  function handleImageUpload(file: File) {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Please upload a JPG or PNG image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      handleExtract("", base64, file.type);
    };
    reader.readAsDataURL(file);
  }

  async function handleFinalSubmit() {
    const missing = getMissingFields();
    if (missing.length > 0) {
      setError(
        `Please fill in required fields: ${missing.join(", ")}`
      );
      return;
    }

    if (!submitterEmail.trim()) {
      setError("Please enter your email");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data = editedData || extracted;
      if (!data) throw new Error("No event data");

      // Check if email has previously approved event
      const checkRes = await fetch("/api/pending-events/check-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submitterEmail }),
      });

      let isAutoApproved = false;
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        isAutoApproved = checkData.hasApproved;
      }

      // Submit event
      const submitRes = await fetch("/api/pending-events/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventData: data,
          submitterEmail,
          imageUrl,
          isAutoApproved,
          category: category || null,
        }),
      });

      const submitData = await submitRes.json();

      if (!submitRes.ok) {
        throw new Error(submitData.error || "Submission failed");
      }

      setConfirmation({
        isAutoApproved,
        shareUrl: `${window.location.origin}/events/${submitData.id}`,
        eventName: data.eventName || "Your Event",
      });

      setStage({ type: "success" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit event"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function updateEditedData(
    field: keyof ExtractedEventData,
    value: string | string[]
  ) {
    setEditedData((prev) =>
      prev ? { ...prev, [field]: value } : prev
    );
  }

  function toggleVibeTag(tag: string) {
    const current = editedData?.vibeTags || [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag].slice(0, 4);
    updateEditedData("vibeTags", next);
  }

  function handlePlaceSelected(place: PlaceDetails) {
    setEditedData((prev) =>
      prev
        ? {
            ...prev,
            venueName: place.name || prev.venueName,
            address: place.address || prev.address,
            neighborhood: place.neighborhood || prev.neighborhood,
            city: place.city || prev.city,
            lat: place.lat,
            lng: place.lng,
          }
        : prev
    );
  }

  // INPUT STAGE
  if (stage.type === "input") {
    return (
      <main className="flex flex-col items-center min-h-screen px-6 py-12 gap-8">
        <div className="flex items-center justify-between w-full max-w-md">
          <h1 className="font-display text-4xl tracking-wide">Submit Event</h1>
          <Link href="/" className="text-sm text-muted underline underline-offset-4">
            Home
          </Link>
        </div>

        <p className="text-muted text-sm w-full max-w-md -mt-4">
          Paste your event link or upload your flyer. We&apos;ll extract the details.
        </p>

        {error && (
          <div className="glass-card w-full max-w-md px-5 py-3 border border-red-500/30 bg-red-900/10">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <form
          onSubmit={handleUrlSubmit}
          className="flex flex-col gap-3 w-full max-w-md"
        >
          <input
            type="url"
            name="urlInput"
            placeholder="https://..."
            className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted"
          />
          <button
            type="submit"
            className="rounded-2xl bg-accent text-white font-display text-lg tracking-wide px-6 py-3 transition-transform active:scale-95"
          >
            Paste Event Link
          </button>
        </form>

        <div className="flex items-center gap-3 w-full max-w-md">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-muted text-xs">OR</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-2xl border-2 border-accent/50 text-accent font-display text-lg tracking-wide px-6 py-3 transition-all hover:border-accent hover:bg-accent/5 w-full max-w-md"
        >
          Upload Flyer Image
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleImageUpload(e.target.files[0]);
            }
          }}
        />

        <button
          onClick={onSwitchToManual}
          className="text-sm text-muted underline underline-offset-4 hover:text-white"
        >
          Don&apos;t have a link? Enter details manually
        </button>
      </main>
    );
  }

  // EXTRACTING STAGE
  if (stage.type === "extracting") {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-6 text-center">
        <div className="animate-spin text-6xl">📋</div>
        <h1 className="font-display text-4xl tracking-wide">Analyzing…</h1>
        <p className="text-muted max-w-sm">
          Extracting event details from your link or image.
        </p>
      </main>
    );
  }

  // PREVIEW STAGE
  if (stage.type === "preview") {
    const missing = getMissingFields();

    return (
      <main className="flex flex-col items-center min-h-screen px-6 py-12 gap-8">
        <div className="flex items-center justify-between w-full max-w-2xl">
          <h1 className="font-display text-4xl tracking-wide">Review Event</h1>
          <button
            onClick={() => {
              setStage({ type: "input" });
              setExtracted(null);
              setEditedData(null);
              setImageUrl(null);
            }}
            className="text-sm text-muted underline underline-offset-4 hover:text-white"
          >
            Start Over
          </button>
        </div>

        {error && (
          <div className="glass-card w-full max-w-2xl px-5 py-3 border border-red-500/30 bg-red-900/10">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="glass-card w-full max-w-2xl px-6 py-6 flex flex-col gap-6 md:flex-row md:gap-8">
          {/* Image Preview */}
          {imageUrl && (
            <div className="flex-shrink-0 md:w-40">
              <img
                src={imageUrl}
                alt="Event"
                className="w-full h-40 object-cover rounded-lg"
              />
            </div>
          )}

          <div className="flex-1 space-y-4">
            {/* Event Name */}
            <div>
              <label className="text-xs text-muted mb-1 block">Event Name</label>
              <input
                type="text"
                value={editedData?.eventName || ""}
                onChange={(e) => updateEditedData("eventName", e.target.value)}
                className={`w-full px-4 py-2 rounded-lg bg-white/5 border outline-none focus:border-accent/60 ${
                  missing.includes("eventName")
                    ? "border-orange-500/60 focus:border-orange-400"
                    : "border-white/10"
                }`}
              />
              {missing.includes("eventName") && (
                <p className="text-xs text-orange-400 mt-1">⚠ Required</p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Date</label>
                <input
                  type="date"
                  value={editedData?.date || ""}
                  onChange={(e) => updateEditedData("date", e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg bg-white/5 border outline-none focus:border-accent/60 ${
                    missing.includes("date")
                      ? "border-orange-500/60 focus:border-orange-400"
                      : "border-white/10"
                  }`}
                />
                {missing.includes("date") && (
                  <p className="text-xs text-orange-400 mt-1">⚠ Required</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Start Time</label>
                <input
                  type="text"
                  placeholder="7:00 PM"
                  value={editedData?.startTime || ""}
                  onChange={(e) => updateEditedData("startTime", e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60"
                />
              </div>
            </div>

            {/* Venue and Address */}
            <div>
              <label className="text-xs text-muted mb-1 block">Venue Name</label>
              <PlaceAutocompleteInput
                value={editedData?.venueName || ""}
                onChange={(value) => updateEditedData("venueName", value)}
                onPlaceSelected={handlePlaceSelected}
                placeholder="Start typing a venue..."
                className={`w-full px-4 py-2 rounded-lg bg-white/5 border outline-none focus:border-accent/60 ${
                  missing.includes("venueName")
                    ? "border-orange-500/60 focus:border-orange-400"
                    : "border-white/10"
                }`}
              />
              {missing.includes("venueName") && (
                <p className="text-xs text-orange-400 mt-1">⚠ Required</p>
              )}
              {(editedData?.neighborhood || editedData?.city) && (
                <p className="text-xs text-muted mt-1">
                  {[editedData?.neighborhood, editedData?.city].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-muted mb-1 block">Address</label>
              <input
                type="text"
                value={editedData?.address || ""}
                onChange={(e) => updateEditedData("address", e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60"
              />
            </div>

            {/* Price and Ticket Link */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Price</label>
                <input
                  type="text"
                  placeholder="FREE, $25, etc"
                  value={editedData?.price || ""}
                  onChange={(e) => updateEditedData("price", e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Ticket Link</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editedData?.ticketLink || ""}
                  onChange={(e) => updateEditedData("ticketLink", e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs text-muted mb-1 block">
                Where should we list this event?
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60 text-white [color-scheme:dark]"
              >
                <option value="">No category</option>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Vibe Tags */}
            <div>
              <label className="text-xs text-muted mb-2 block">Vibe Tags</label>
              <div className="flex flex-wrap gap-2">
                {VALID_VIBE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleVibeTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-all ${
                      editedData?.vibeTags?.includes(tag)
                        ? "bg-accent text-white"
                        : "bg-white/5 border border-white/10 text-muted hover:border-accent/60"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Email Input */}
        <div className="w-full max-w-2xl">
          <label className="text-xs text-muted mb-2 block">Your Email</label>
          <input
            type="email"
            value={submitterEmail}
            onChange={(e) => setSubmitterEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full max-w-2xl">
          <button
            onClick={() => {
              setStage({ type: "input" });
              setExtracted(null);
              setEditedData(null);
              setImageUrl(null);
            }}
            className="flex-1 rounded-2xl border-2 border-white/10 text-white font-display text-lg tracking-wide px-6 py-3 transition-all hover:border-white/30"
          >
            Back
          </button>
          <button
            onClick={handleFinalSubmit}
            disabled={submitting}
            className="flex-1 rounded-2xl bg-accent text-white font-display text-lg tracking-wide px-6 py-3 transition-transform active:scale-95 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Event"}
          </button>
        </div>
      </main>
    );
  }

  // SUCCESS STAGE
  if (stage.type === "success" && confirmation) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-6 text-center">
        <span className="text-6xl">
          {confirmation.isAutoApproved ? "🎉" : "📬"}
        </span>
        <h1 className="font-display text-4xl tracking-wide">
          {confirmation.isAutoApproved ? "Your Event is Live!" : "Pending Review"}
        </h1>
        <p className="text-muted max-w-sm">
          {confirmation.isAutoApproved
            ? `${confirmation.eventName} is now live on Find Your Night!`
            : `Your event is under review. We'll approve it within 24 hours.`}
        </p>

        <button
          onClick={async () => {
            const shareData = {
              title: confirmation.eventName,
              text: "Check out this event on Find Your Night!",
              url: confirmation.shareUrl,
            };
            if (navigator.share) {
              await navigator.share(shareData);
            } else {
              await navigator.clipboard.writeText(confirmation.shareUrl);
            }
          }}
          className="rounded-2xl bg-accent/20 border-2 border-accent text-accent font-display text-lg tracking-wide px-8 py-3 transition-all hover:bg-accent/30"
        >
          Share Event
        </button>

        <Link
          href="/"
          className="rounded-2xl bg-accent text-white font-display text-lg tracking-wide px-8 py-3 transition-transform active:scale-95"
        >
          Back Home
        </Link>
      </main>
    );
  }

  return null;
}

function ManualSubmitForm({ onSwitchToSmart }: { onSwitchToSmart: () => void }) {
  const [form, setForm] = useState({
    venueName: "",
    type: "",
    neighborhood: "",
    city: "",
    eventDate: "",
    eventTime: "",
    description: "",
    vibeTags: "",
    contactEmail: "",
  });
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  useEffect(() => {
    const query = form.venueName.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("venue_name, type, neighborhood")
        .eq("status", "approved")
        .ilike("venue_name", `%${query}%`)
        .limit(5);

      if (!cancelled && !error && data) {
        const unique = Array.from(
          new Map(data.map((v) => [v.venue_name, v])).values()
        );
        setSuggestions(unique);
        setShowSuggestions(true);
      }

      if (error) {
        console.error("Venue suggestion query error:", error);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [form.venueName]);

  function selectSuggestion(suggestion: VenueSuggestion) {
    setForm((f) => ({
      ...f,
      venueName: suggestion.venue_name,
      type: suggestion.type ?? "",
      neighborhood: suggestion.neighborhood ?? "",
    }));
    setShowSuggestions(false);
  }

  function handlePlaceSelected(place: PlaceDetails) {
    setForm((f) => ({
      ...f,
      venueName: place.name || f.venueName,
      neighborhood: place.neighborhood || f.neighborhood,
      city: place.city || f.city,
    }));
    setCoords({ lat: place.lat, lng: place.lng });
    setShowSuggestions(false);
  }

  function toggleVibe(vibe: string) {
    setForm((f) => {
      const tags = f.vibeTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const has = tags.includes(vibe);
      const next = has ? tags.filter((t) => t !== vibe) : [...tags, vibe];
      return { ...f, vibeTags: next.join(", ") };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (
      !form.venueName.trim() ||
      !form.type.trim() ||
      !form.neighborhood.trim() ||
      !form.city.trim() ||
      !form.eventDate.trim() ||
      !form.eventTime.trim() ||
      !form.description.trim() ||
      !form.contactEmail.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    const formattedDate = new Date(`${form.eventDate}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const dateTime = `${formattedDate} at ${form.eventTime}`;

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dateTime, lat: coords.lat, lng: coords.lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Something went wrong");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-6 text-center">
        <span className="text-6xl">🎉</span>
        <h1 className="font-display text-4xl tracking-wide">Thanks!</h1>
        <p className="text-muted max-w-sm">
          Your submission is in. We review new spots and events before they go live.
        </p>
        <Link
          href="/"
          className="rounded-2xl bg-accent text-white font-display text-xl tracking-wide px-8 py-3 transition-transform active:scale-95"
        >
          Back to Find Your Night
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-screen px-6 py-12 gap-6">
      <div className="flex items-center justify-between w-full max-w-md">
        <h1 className="font-display text-4xl tracking-wide">Submit an Event</h1>
        <Link href="/" className="text-sm text-muted underline underline-offset-4">
          Home
        </Link>
      </div>
      <p className="text-muted text-sm w-full max-w-md -mt-4">
        Tell us about your venue or event — we&apos;ll review it before it goes live.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-md">
        <div className="relative">
          <PlaceAutocompleteInput
            value={form.venueName}
            onChange={(value) => update("venueName", value)}
            onPlaceSelected={handlePlaceSelected}
            placeholder="Venue / Event Name *"
            className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 top-full left-0 right-0 mt-1 glass-card overflow-hidden">
              {suggestions.map((suggestion) => (
                <li key={suggestion.venue_name}>
                  <button
                    type="button"
                    onMouseDown={() => selectSuggestion(suggestion)}
                    className="w-full text-left px-5 py-3 hover:bg-white/5 transition-colors"
                  >
                    <span className="block">{suggestion.venue_name}</span>
                    <span className="block text-xs text-muted">
                      {suggestion.type} · {suggestion.neighborhood}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <input
          type="text"
          placeholder="Type (e.g. Bar, Festival, Pop-up) *"
          value={form.type}
          onChange={(e) => update("type", e.target.value)}
          className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted"
          maxLength={60}
        />
        <input
          type="text"
          placeholder="Neighborhood *"
          value={form.neighborhood}
          onChange={(e) => update("neighborhood", e.target.value)}
          className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted"
          maxLength={100}
        />
        <input
          type="text"
          placeholder="City *"
          value={form.city}
          onChange={(e) => update("city", e.target.value)}
          className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted"
          maxLength={100}
        />
        <div className="flex gap-3">
          <input
            type="date"
            value={form.eventDate}
            onChange={(e) => update("eventDate", e.target.value)}
            className="glass-card w-1/2 px-5 py-4 outline-none focus:border-accent/60 text-white [color-scheme:dark]"
          />
          <select
            value={form.eventTime}
            onChange={(e) => update("eventTime", e.target.value)}
            className="glass-card w-1/2 px-5 py-4 outline-none focus:border-accent/60 text-white [color-scheme:dark]"
          >
            <option value="" disabled>
              Time *
            </option>
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
        <textarea
          placeholder="Description *"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted min-h-28 resize-none"
          maxLength={1000}
        />

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Vibe tags</p>
          <div className="flex flex-wrap gap-2">
            {VIBE_OPTIONS.map((vibe) => {
              const active = form.vibeTags
                .split(",")
                .map((t) => t.trim())
                .includes(vibe);
              return (
                <button
                  type="button"
                  key={vibe}
                  onClick={() => toggleVibe(vibe)}
                  className={`text-xs px-3 py-2 rounded-full border transition-colors ${
                    active
                      ? "bg-accent/20 border-accent text-accent"
                      : "bg-white/5 border-card-border text-muted"
                  }`}
                >
                  {vibe}
                </button>
              );
            })}
          </div>
        </div>

        <input
          type="email"
          placeholder="Contact Email *"
          value={form.contactEmail}
          onChange={(e) => update("contactEmail", e.target.value)}
          className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted"
          maxLength={254}
        />

        {error && <p className="text-sm text-accent">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-accent text-white font-display text-2xl tracking-wide py-4 transition-transform active:scale-95 disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>

        <button
          type="button"
          onClick={onSwitchToSmart}
          className="text-sm text-muted underline underline-offset-4 hover:text-white text-center"
        >
          Have a link instead? Use the smart form
        </button>
      </form>
    </main>
  );
}
