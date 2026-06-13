"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ExtractedEventData } from "@/lib/types";
import { PlaceDetails } from "@/components/PlaceAutocompleteInput";
import { CitySelection } from "@/components/CityAutocompleteInput";
import EventReviewForm from "@/components/EventReviewForm";
import { compressImage } from "@/lib/imageCompression";

const SECRET_LOCATION_NAME = "Secret Location";

const BLANK_EVENT_DATA: ExtractedEventData = {
  eventName: "",
  date: "",
  startTime: "",
  venueName: "",
  address: "",
  neighborhood: "",
  city: "",
  state: null,
  description: "",
  price: "",
  ticketLink: "",
  vibeTags: [],
  lat: null,
  lng: null,
  isPrivateLocation: false,
  privateLocationNote: "",
};

type Stage = "input" | "extracting" | "preview" | "success";

interface ConfirmationData {
  shareUrl: string;
  eventName: string;
}

export default function SubmitPage() {
  const [stage, setStage] = useState<Stage>("input");
  const [extracted, setExtracted] = useState<ExtractedEventData | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);
  const [editedData, setEditedData] = useState<ExtractedEventData | null>(null);
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function getMissingFields(): string[] {
    const data = editedData || extracted;
    if (!data) return [];
    const missing: string[] = [];
    if (!data.eventName?.trim()) missing.push("eventName");
    if (!data.date?.trim()) missing.push("date");
    if (!data.venueName?.trim()) missing.push("venueName");
    if (!data.city?.trim()) missing.push("city");
    return missing;
  }

  function resetToStart() {
    setStage("input");
    setExtracted(null);
    setEditedData(null);
    setImageUrl(null);
    setCategory("");
    setError("");
  }

  function startManualEntry() {
    setExtracted(BLANK_EVENT_DATA);
    setEditedData(BLANK_EVENT_DATA);
    setImageUrl(null);
    setError("");
    setStage("preview");
  }

  async function handleExtract(url: string, imageBase64?: string, mimeType?: string) {
    setStage("extracting");
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
      setStage("preview");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract event data"
      );
      setStage("input");
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

  async function handleImageUpload(file: File) {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Please upload a JPG or PNG image");
      return;
    }

    try {
      const { base64, mimeType } = await compressImage(file);
      handleExtract("", base64, mimeType);
    } catch {
      setError("Failed to process image. Please try a different file.");
    }
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

      const submitRes = await fetch("/api/pending-events/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventData: data,
          submitterEmail,
          imageUrl,
          category: category || null,
        }),
      });

      const submitData = await submitRes.json();

      if (!submitRes.ok) {
        throw new Error(submitData.error || "Submission failed");
      }

      setConfirmation({
        shareUrl: `${window.location.origin}/events/${submitData.id}`,
        eventName: data.eventName || "Your Event",
      });

      setStage("success");
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
            city: prev.city || place.city,
            state: prev.state || place.state || null,
            lat: place.lat,
            lng: place.lng,
          }
        : prev
    );
  }

  function handleCitySelected(selection: CitySelection) {
    setEditedData((prev) =>
      prev
        ? {
            ...prev,
            city: selection.city,
            state: selection.state || null,
          }
        : prev
    );
  }

  function togglePrivateLocation(checked: boolean) {
    setEditedData((prev) => {
      if (!prev) return prev;
      const venueName =
        checked && !prev.venueName?.trim() ? SECRET_LOCATION_NAME : prev.venueName;
      return { ...prev, isPrivateLocation: checked, venueName };
    });
  }

  // INPUT STAGE
  if (stage === "input") {
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
          onClick={startManualEntry}
          className="text-sm text-muted underline underline-offset-4 hover:text-white"
        >
          Don&apos;t have a link? Enter details manually
        </button>
      </main>
    );
  }

  // EXTRACTING STAGE
  if (stage === "extracting") {
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
  if (stage === "preview") {
    const missing = getMissingFields();

    return (
      <main className="flex flex-col items-center min-h-screen px-6 py-12 gap-8">
        <div className="flex items-center justify-between w-full max-w-2xl">
          <h1 className="font-display text-4xl tracking-wide">Review Event</h1>
          <button
            onClick={resetToStart}
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

        <EventReviewForm
          data={editedData}
          missing={missing}
          imageUrl={imageUrl}
          category={category}
          submitterEmail={submitterEmail}
          onFieldChange={updateEditedData}
          onPlaceSelected={handlePlaceSelected}
          onCitySelected={handleCitySelected}
          onTogglePrivateLocation={togglePrivateLocation}
          onToggleVibeTag={toggleVibeTag}
          onCategoryChange={setCategory}
          onEmailChange={setSubmitterEmail}
        />

        {/* Action Buttons */}
        <div className="flex gap-3 w-full max-w-2xl">
          <button
            onClick={resetToStart}
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
  if (stage === "success" && confirmation) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-6 text-center">
        <span className="text-6xl">📬</span>
        <h1 className="font-display text-4xl tracking-wide">Pending Review</h1>
        <p className="text-muted max-w-sm">
          Your event is under review. We&apos;ll approve it within 24 hours.
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
