"use client";

import { Venue, FeaturedVenueEvent } from "@/lib/types";
import { formatCincyTime } from "@/lib/cincyDate";
import { formatMatchReason } from "@/lib/matchReason";
import { useSaveEvent } from "@/lib/useSaveEvent";
import { useSaveVenue } from "@/lib/useSaveVenue";
import SaveAuthModal from "@/components/SaveAuthModal";
import DirectionsLink from "@/components/DirectionsLink";
import HostEventLink from "@/components/HostEventLink";

interface ProgressDots {
  total: number;
  index: number;
  onDotClick: (i: number) => void;
}

interface Props {
  venue: Venue;
  event: FeaturedVenueEvent | null;
  onBack: () => void;
  onSkip: () => void;
  skipDisabled?: boolean;
  positionLabel?: string;
  onPrevZone?: () => void;
  onNextZone?: () => void;
  progressDots?: ProgressDots;
}

type SaveState = ReturnType<typeof useSaveEvent>;

// When a specific dated event is showing (the "Tonight · time" flyer view),
// Save must write an event interaction against that event's pending_events
// id, not a venue-level save — otherwise the post-visit survey trigger
// (which reads user_event_interactions) never fires for anything saved
// from this screen. Splitting into two thin wrapper components (rather than
// branching which hook to call inside one component) keeps this
// rules-of-hooks safe: each wrapper calls exactly one save hook,
// unconditionally, and React remounts fresh (not conditionally-hooks) when
// `event` flips from null to populated.
export default function VenueDetailScreen(props: Props) {
  return props.event ? (
    <VenueDetailScreenWithEvent {...props} event={props.event} />
  ) : (
    <VenueDetailScreenWithVenue {...props} event={null} />
  );
}

function VenueDetailScreenWithEvent(props: Props & { event: FeaturedVenueEvent }) {
  const saveState = useSaveEvent(props.event.id);
  return <VenueDetailScreenBody {...props} saveState={saveState} />;
}

function VenueDetailScreenWithVenue(props: Props & { event: null }) {
  const saveState = useSaveVenue(props.venue.placeId ?? "", props.venue.id);
  return <VenueDetailScreenBody {...props} saveState={saveState} />;
}

function VenueDetailScreenBody({
  venue,
  event,
  onBack,
  onSkip,
  skipDisabled = false,
  positionLabel,
  onPrevZone,
  onNextZone,
  progressDots,
  saveState,
}: Props & { saveState: SaveState }) {
  const { saved, loading, toggle, showAuthModal, handleAuthed, closeAuthModal, userId } = saveState;

  const tags = event ? event.tags : venue.tags;
  const matchReason = formatMatchReason(venue);

  return (
    <main className="flex flex-col min-h-screen pb-12">
      {/* Back + counter */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-muted text-sm active:opacity-70">
          <span aria-hidden>←</span>
          <span>Back</span>
        </button>
        {positionLabel && <span className="text-xs text-muted/60 font-medium">{positionLabel}</span>}
      </div>

      {/* Hero — normal scroll, no sticky/shrinking behavior */}
      <div className="relative mx-5 rounded-2xl overflow-hidden mb-5">
        {event?.imageUrl ? (
          <img src={event.imageUrl} alt={event.name} className="w-full h-56 object-cover" />
        ) : venue.imageUrl ? (
          <>
            <img src={venue.imageUrl} alt={venue.name} className="w-full h-56 object-cover" />
            {venue.photoAttribution?.name && (
              <p className="absolute bottom-1.5 right-2 text-[10px] text-white/70">
                Photo:{" "}
                {venue.photoAttribution.uri ? (
                  <a
                    href={venue.photoAttribution.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    {venue.photoAttribution.name}
                  </a>
                ) : (
                  venue.photoAttribution.name
                )}
              </p>
            )}
          </>
        ) : (
          <div className="w-full h-56 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center">
            <span className="text-5xl opacity-30" aria-hidden>
              🌙
            </span>
          </div>
        )}

        {onPrevZone && (
          <button onClick={onPrevZone} className="absolute inset-y-0 left-0 w-1/3" aria-label="Previous result" />
        )}
        {onNextZone && (
          <button onClick={onNextZone} className="absolute inset-y-0 right-0 w-1/3" aria-label="Next result" />
        )}

        {progressDots && progressDots.total > 1 && progressDots.total <= 12 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {Array.from({ length: progressDots.total }).map((_, i) => (
              <button
                key={i}
                onClick={() => progressDots.onDotClick(i)}
                aria-label={`Go to result ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === progressDots.index ? "w-4 bg-white" : "w-1.5 bg-white/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 flex flex-col gap-4">
        <div>
          {venue.featured && (
            <span className="inline-block text-xs px-2 py-1 rounded-full bg-accent text-black font-semibold tracking-wide mb-2">
              🌟 Local Event
            </span>
          )}

          {event ? (
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent">
                Tonight · {formatCincyTime(event.startDt)}
              </span>
            </div>
          ) : (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted/50 mb-1.5">Tonight</p>
          )}

          <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight leading-tight">
            {venue.name}
          </h1>
          <p className="text-sm text-muted mt-1">
            {venue.type} · {venue.neighborhood} · {venue.price}
          </p>
        </div>

        {/* Address / Hours / Happy Hour */}
        {(venue.address || venue.hours || venue.happyHour) && (
          <div className="rounded-xl bg-white/5 border border-card-border px-4 py-3 flex flex-col gap-2">
            {venue.address && (
              <DirectionsLink
                targetType="venue"
                targetId={venue.id}
                address={venue.address}
                lat={venue.lat}
                lng={venue.lng}
                userId={userId}
              />
            )}
            {venue.hours && (
              <p className="flex items-start gap-2 text-sm text-muted">
                <span aria-hidden>🕒</span>
                <span>{venue.hours}</span>
              </p>
            )}
            {venue.happyHour && (
              <p className="flex items-start gap-2 text-sm text-muted">
                <span aria-hidden>🍹</span>
                <span>Happy hour: {venue.happyHour}</span>
              </p>
            )}
          </div>
        )}

        {/* WHY TONIGHT */}
        {event ? (
          <div className="rounded-xl border-l-2 border-accent bg-accent/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-accent mb-1.5">About this spot</p>
            <p className="text-sm leading-relaxed">{event.description}</p>
          </div>
        ) : (
          venue.whyTonight && (
            <div className="rounded-xl border-l-2 border-zinc-600 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted mb-1.5">About this spot</p>
              <p className="text-sm leading-relaxed">{venue.whyTonight}</p>
            </div>
          )
        )}

        {/* Vibe tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/30 font-body font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Match reason — personalized, tonight-specific trust signal distinct from the static "About this spot" blurb */}
        {matchReason && (
          <div className="rounded-lg border border-accent/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest font-bold text-accent mb-1">Why Tonight</p>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <span aria-hidden>✨</span>
              <span>{matchReason}</span>
            </p>
          </div>
        )}

        {/* Hours status — computed server-side from stored weekly hours */}
        {venue.hoursStatus && (
          <p className={`text-xs ${venue.hoursStatus.closingSoon ? "text-orange-400" : "text-muted"}`}>
            {venue.hoursStatus.text}
          </p>
        )}

        {/* Skip / Save */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={onSkip}
            disabled={skipDisabled}
            className="flex-1 rounded-2xl border border-card-border py-3 text-sm font-semibold text-muted active:scale-95 transition-transform disabled:opacity-30"
          >
            Skip →
          </button>
          <button
            onClick={toggle}
            disabled={loading}
            className={`flex-1 rounded-2xl py-3 text-sm font-semibold active:scale-95 transition-all disabled:opacity-60 ${
              saved
                ? "bg-accent text-black animate-saveBounce"
                : "bg-accent/20 border border-accent/30 text-accent"
            }`}
          >
            {saved ? "Saved ❤️" : "Save"}
          </button>
        </div>

        <div className="flex justify-center pt-2">
          <HostEventLink />
        </div>
      </div>

      {showAuthModal && <SaveAuthModal onClose={closeAuthModal} onAuthed={handleAuthed} />}
    </main>
  );
}
