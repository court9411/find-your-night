"use client";

import { useEffect, useState } from "react";
import {
  PendingVisit,
  VisitRating,
  CrowdLevel,
  MusicQuality,
  PriceSentiment,
  RATING_OPTIONS,
  CROWD_OPTIONS,
  MUSIC_OPTIONS,
  PRICE_OPTIONS,
  ratingEmoji,
  ratingLabel,
  crowdLabel,
  musicLabel,
  priceLabel,
} from "@/lib/visitSurvey";
import { usePhotoCapture } from "@/lib/usePhotoCapture";
import { compressImage } from "@/lib/imageCompression";
import { track } from "@/lib/analytics";

const SURPRISE_MAX = 100;
const AUTO_ADVANCE_MS = 280;

type Step = 1 | 2 | 3 | 4 | 5 | 6 | "success";

interface Props {
  visit: PendingVisit;
  onClose: () => void;
  onComplete: () => void;
}

function ProgressDots({ step }: { step: Step }) {
  const current = step === "success" ? 6 : step;
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <span
          key={n}
          className={`h-1.5 rounded-full transition-all ${
            n === current ? "w-5 bg-accent" : n < current ? "w-1.5 bg-accent/50" : "w-1.5 bg-white/15"
          }`}
        />
      ))}
    </div>
  );
}

function StepHeader({ step, onBack, onClose }: { step: Step; onBack: () => void; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 pt-6">
      {step !== 1 && step !== "success" ? (
        <button onClick={onBack} aria-label="Back" className="w-11 h-11 -ml-2 flex items-center justify-center text-white/70 active:opacity-60">
          <span aria-hidden className="text-xl">←</span>
        </button>
      ) : (
        <span className="w-11 h-11" />
      )}
      {step !== "success" && <ProgressDots step={step} />}
      {step !== "success" ? (
        <button onClick={onClose} aria-label="Close" className="w-11 h-11 -mr-2 flex items-center justify-center text-white/50 active:opacity-60">
          <span aria-hidden className="text-xl">✕</span>
        </button>
      ) : (
        <span className="w-11 h-11" />
      )}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full min-h-[52px] rounded-full bg-accent hover:bg-accent-hover text-black font-display font-bold text-lg tracking-wide py-3.5 active:scale-[0.98] transition-transform disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export default function VisitSurveyModal({ visit, onClose, onComplete }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [rating, setRating] = useState<VisitRating | null>(null);
  const [crowdLevel, setCrowdLevel] = useState<CrowdLevel | null>(null);
  const [musicQuality, setMusicQuality] = useState<MusicQuality | null>(null);
  const [priceSentiment, setPriceSentiment] = useState<PriceSentiment | null>(null);
  const [wouldReturn, setWouldReturn] = useState<boolean | null>(null);
  const [surpriseNote, setSurpriseNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const photo = usePhotoCapture();

  useEffect(() => {
    track("visit_survey_started", { event_id: visit.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    track("visit_survey_abandoned", { event_id: visit.id, step: String(step) });
    onClose();
  }

  function goBack() {
    setStep((s) => (typeof s === "number" && s > 1 ? ((s - 1) as Step) : s));
  }

  function selectRating(value: VisitRating) {
    setRating(value);
    setTimeout(() => setStep(2), AUTO_ADVANCE_MS);
  }

  function selectCrowd(value: CrowdLevel) {
    setCrowdLevel(value);
    setTimeout(() => setStep(3), AUTO_ADVANCE_MS);
  }

  function selectMusic(value: MusicQuality) {
    setMusicQuality(value);
    setTimeout(() => setStep(4), AUTO_ADVANCE_MS);
  }

  function selectPrice(value: PriceSentiment) {
    setPriceSentiment(value);
    setTimeout(() => setStep(5), AUTO_ADVANCE_MS);
  }

  async function handleFinish() {
    setSubmitting(true);
    setError("");
    try {
      let photoPayload: { base64: string; mimeType: string } | undefined;
      if (photo.file) {
        const { base64, mimeType } = await compressImage(photo.file);
        photoPayload = { base64, mimeType };
      }

      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: visit.id,
          venueId: visit.venue_id,
          attended: true,
          rating,
          crowdLevel,
          musicQuality,
          priceSentiment,
          wouldReturn,
          surpriseNote: surpriseNote.trim() || undefined,
          photo: photoPayload,
        }),
      });
      if (!res.ok) throw new Error("Failed to save visit");

      track("visit_survey_completed", { event_id: visit.id, rating, would_return: wouldReturn });
      setStep("success");
    } catch {
      setError("Something went wrong saving your visit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <StepHeader step={step} onBack={goBack} onClose={handleClose} />

      {/* Step 1 — Rating */}
      {step === 1 && (
        <div className="flex-1 flex flex-col justify-center px-6 gap-8">
          <div className="text-center">
            <h2 className="font-display font-bold text-white text-2xl tracking-tight">How was it?</h2>
            <p className="text-sm text-muted mt-1 truncate">{visit.event_name}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {RATING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => selectRating(opt.value)}
                className={`rounded-2xl py-7 flex flex-col items-center gap-2 border transition-all active:scale-95 ${
                  rating === opt.value
                    ? "bg-accent/15 border-accent animate-cardPop"
                    : "bg-white/[0.04] border-card-border"
                }`}
              >
                <span className="text-4xl leading-none" aria-hidden>
                  {opt.emoji}
                </span>
                <span className="text-sm font-semibold text-white">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Crowd */}
      {step === 2 && (
        <PillStep
          title="How was the crowd?"
          options={CROWD_OPTIONS}
          selected={crowdLevel}
          onSelect={selectCrowd}
        />
      )}

      {/* Step 3 — Music */}
      {step === 3 && (
        <PillStep
          title="How was the music?"
          options={MUSIC_OPTIONS}
          selected={musicQuality}
          onSelect={selectMusic}
        />
      )}

      {/* Step 4 — Price */}
      {step === 4 && (
        <PillStep
          title="How was the price?"
          options={PRICE_OPTIONS}
          selected={priceSentiment}
          onSelect={selectPrice}
        />
      )}

      {/* Step 5 — Would return + photo */}
      {step === 5 && (
        <div className="flex-1 flex flex-col px-6 gap-8 pt-4 pb-8">
          <div className="text-center">
            <h2 className="font-display font-bold text-white text-2xl tracking-tight">Would you go back?</h2>
          </div>
          <div className="flex gap-3">
            {[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setWouldReturn(opt.value)}
                className={`flex-1 min-h-[52px] rounded-full font-display font-bold text-lg tracking-wide transition-all active:scale-95 ${
                  wouldReturn === opt.value
                    ? "bg-accent text-black"
                    : "bg-white/[0.04] border border-card-border text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
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

          <div className="mt-auto">
            <PrimaryButton onClick={() => setStep(6)} disabled={wouldReturn === null}>
              Next
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Step 6 — Surprise note */}
      {step === 6 && (
        <div className="flex-1 flex flex-col px-6 gap-4 pt-4 pb-8">
          <div>
            <h2 className="font-display font-bold text-white text-2xl tracking-tight">What surprised you?</h2>
            <p className="text-sm text-muted mt-2">
              This becomes next week&apos;s &ldquo;Why Tonight&rdquo; line for other users.
            </p>
          </div>
          <textarea
            value={surpriseNote}
            onChange={(e) => setSurpriseNote(e.target.value.slice(0, SURPRISE_MAX))}
            placeholder="Optional…"
            maxLength={SURPRISE_MAX}
            className="w-full min-h-28 rounded-2xl bg-white/[0.06] border border-card-border px-4 py-3 text-sm placeholder:text-muted/60 outline-none focus:border-accent/50 transition-colors resize-none"
          />
          <p className="text-xs text-muted/60 text-right -mt-2">
            {surpriseNote.length}/{SURPRISE_MAX}
          </p>

          {error && <p className="text-red-300 text-sm">{error}</p>}

          <div className="mt-auto">
            <PrimaryButton onClick={handleFinish} disabled={submitting}>
              {submitting ? "Saving…" : surpriseNote.trim() ? "Finish" : "Skip & finish"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Success */}
      {step === "success" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5 text-center">
          <span className="text-6xl" aria-hidden>
            ✅
          </span>
          <div>
            <h2 className="font-display font-extrabold text-white text-3xl tracking-tight">
              Added to your Night History
            </h2>
            <p className="text-sm text-muted mt-2 max-w-xs mx-auto">
              Your recommendations just got a little sharper.
            </p>
          </div>

          <div className="w-full max-w-xs rounded-2xl glass-card p-4 flex flex-col gap-2 text-left">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                {ratingEmoji(rating)}
              </span>
              <span className="font-display font-bold text-white">{ratingLabel(rating)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs text-muted">
              {crowdLevel && <span className="rounded-full bg-white/[0.06] px-2.5 py-1">{crowdLabel(crowdLevel)} crowd</span>}
              {musicQuality && <span className="rounded-full bg-white/[0.06] px-2.5 py-1">{musicLabel(musicQuality)}</span>}
              {priceSentiment && <span className="rounded-full bg-white/[0.06] px-2.5 py-1">{priceLabel(priceSentiment)}</span>}
              {wouldReturn !== null && (
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1">
                  {wouldReturn ? "Would return" : "Wouldn't return"}
                </span>
              )}
            </div>
          </div>

          <div className="w-full max-w-xs mt-2">
            <PrimaryButton onClick={onComplete}>Done</PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

function PillStep<T extends string>({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex-1 flex flex-col justify-center px-6 gap-8">
      <h2 className="font-display font-bold text-white text-2xl tracking-tight text-center">{title}</h2>
      <div className="flex flex-wrap justify-center gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`min-h-[52px] px-6 rounded-full font-display font-bold text-base tracking-wide transition-all active:scale-95 ${
              selected === opt.value
                ? "bg-accent text-black animate-cardPop"
                : "bg-white/[0.04] border border-card-border text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
