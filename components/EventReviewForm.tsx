"use client";

import { ExtractedEventData } from "@/lib/types";
import PlaceAutocompleteInput, { PlaceDetails } from "@/components/PlaceAutocompleteInput";
import CityAutocompleteInput, { CitySelection } from "@/components/CityAutocompleteInput";

export const VALID_VIBE_TAGS = [
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

interface EventReviewFormProps {
  data: ExtractedEventData | null;
  missing: string[];
  imageUrl?: string | null;
  submitterEmail: string;
  onFieldChange: (field: keyof ExtractedEventData, value: string | string[]) => void;
  onPlaceSelected: (place: PlaceDetails) => void;
  onCitySelected: (selection: CitySelection) => void;
  onTogglePrivateLocation: (checked: boolean) => void;
  onToggleVibeTag: (tag: string) => void;
  onEmailChange: (email: string) => void;
}

export default function EventReviewForm({
  data,
  missing,
  imageUrl,
  submitterEmail,
  onFieldChange,
  onPlaceSelected,
  onCitySelected,
  onTogglePrivateLocation,
  onToggleVibeTag,
  onEmailChange,
}: EventReviewFormProps) {
  const fieldClass = (field: string) =>
    `w-full px-4 py-2 rounded-lg bg-white/5 border outline-none focus:border-accent/60 ${
      missing.includes(field)
        ? "border-orange-500/60 focus:border-orange-400"
        : "border-white/10"
    }`;

  return (
    <>
      <div className="glass-card w-full max-w-2xl px-6 py-6 flex flex-col gap-6 md:flex-row md:gap-8">
        {/* Image Preview */}
        {imageUrl && (
          <div className="flex-shrink-0 md:w-40">
            <img
              src={imageUrl}
              alt="Event"
              className="w-full max-h-40 object-contain rounded-lg bg-black/20"
            />
          </div>
        )}

        <div className="flex-1 space-y-4">
          {/* Event Name */}
          <div>
            <label className="text-xs text-muted mb-1 block">Event Name</label>
            <input
              type="text"
              value={data?.eventName || ""}
              onChange={(e) => onFieldChange("eventName", e.target.value)}
              className={fieldClass("eventName")}
            />
            {missing.includes("eventName") && (
              <p className="text-xs text-orange-400 mt-1">⚠ Required</p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="text-xs text-muted mb-1 block">Date</label>
              <input
                type="date"
                value={data?.date || ""}
                onChange={(e) => onFieldChange("date", e.target.value)}
                className={`${fieldClass("date")} min-w-0 text-base text-white [color-scheme:dark]`}
              />
              {missing.includes("date") && (
                <p className="text-xs text-orange-400 mt-1">⚠ Required</p>
              )}
            </div>
            <div className="min-w-0">
              <label className="text-xs text-muted mb-1 block">Start Time</label>
              <select
                value={data?.startTime || ""}
                onChange={(e) => onFieldChange("startTime", e.target.value)}
                className="w-full min-w-0 px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60 text-base text-white [color-scheme:dark]"
              >
                <option value="">Select time</option>
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="text-xs text-muted mb-1 block">Venue Name</label>
            <PlaceAutocompleteInput
              value={data?.venueName || ""}
              onChange={(value) => onFieldChange("venueName", value)}
              onPlaceSelected={onPlaceSelected}
              placeholder="Start typing a venue..."
              className={fieldClass("venueName")}
            />
            {missing.includes("venueName") && (
              <p className="text-xs text-orange-400 mt-1">⚠ Required</p>
            )}
            {data?.neighborhood && (
              <p className="text-xs text-muted mt-1">{data.neighborhood}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="text-xs text-muted mb-1 block">City</label>
            <CityAutocompleteInput
              value={data?.city || ""}
              onChange={(value) => onFieldChange("city", value)}
              onCitySelected={onCitySelected}
              placeholder="Start typing a city..."
              className={fieldClass("city")}
            />
            {missing.includes("city") && (
              <p className="text-xs text-orange-400 mt-1">⚠ Required</p>
            )}
          </div>

          {/* Private Location */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={!!data?.isPrivateLocation}
                onChange={(e) => onTogglePrivateLocation(e.target.checked)}
                className="accent-accent"
              />
              Private location / revealed after RSVP
            </label>
            {data?.isPrivateLocation && (
              <div>
                <input
                  type="text"
                  placeholder="e.g. DM us for the address"
                  value={data?.privateLocationNote || ""}
                  onChange={(e) => onFieldChange("privateLocationNote", e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60"
                  maxLength={200}
                />
                <p className="text-xs text-muted mt-1">
                  The exact address won&apos;t be shown publicly. We&apos;ll show your city and this note instead.
                </p>
              </div>
            )}
          </div>

          {!data?.isPrivateLocation && (
            <div>
              <label className="text-xs text-muted mb-1 block">Address</label>
              <input
                type="text"
                value={data?.address || ""}
                onChange={(e) => onFieldChange("address", e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-xs text-muted mb-1 block">Description</label>
            <textarea
              value={data?.description || ""}
              onChange={(e) => onFieldChange("description", e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60 min-h-24 resize-none"
              maxLength={1000}
            />
          </div>

          {/* Price and Ticket Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Price</label>
              <input
                type="text"
                placeholder="FREE, $25, etc"
                value={data?.price || ""}
                onChange={(e) => onFieldChange("price", e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Ticket Link</label>
              <input
                type="url"
                placeholder="https://..."
                value={data?.ticketLink || ""}
                onChange={(e) => onFieldChange("ticketLink", e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60"
              />
            </div>
          </div>

          {/* Vibe Tags */}
          <div>
            <label className="text-xs text-muted mb-2 block">Vibe Tags</label>
            <div className="flex flex-wrap gap-2">
              {VALID_VIBE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleVibeTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    data?.vibeTags?.includes(tag)
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
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-accent/60"
        />
      </div>
    </>
  );
}
