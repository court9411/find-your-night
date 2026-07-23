"use client";

import { useRef, useState } from "react";
import { Moon, X, Heart } from "lucide-react";
import { Venue } from "@/lib/types";
import { formatMatchReason } from "@/lib/matchReason";

interface Props {
  venues: Venue[];
  onSwipe: (venue: Venue, direction: "left" | "right") => void;
  onExhausted: () => void;
}

const SWIPE_THRESHOLD = 100;
const EXIT_DURATION_MS = 220;

/**
 * Tinder/Hinge-style swipeable card stack — plain Pointer Events, no gesture
 * library (none is installed and only ever 3 cards are in play, see
 * pickPickerVenues's STACK_SIZE cap). Fills whatever height its parent
 * gives it (parent sizes that to near-fullscreen) rather than a fixed
 * rem height, so the photo + overlaid text never gets clipped regardless
 * of venue name length. Top card drags with the pointer; released past
 * SWIPE_THRESHOLD animates off and fires onSwipe, otherwise snaps back.
 * The X/heart buttons are enlarged and anchored on the card itself (not
 * floating in empty space below it) and drive the same handleSwipe path
 * for non-drag input.
 */
export default function PickerSwipeStack({ venues, onSwipe, onExhausted }: Props) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const dragging = useRef(false);
  const startX = useRef(0);

  const visible = venues.slice(index, index + 3);

  function handleSwipe(direction: "left" | "right") {
    const venue = venues[index];
    if (!venue || exiting) return;
    setExiting(direction);
    setTimeout(() => {
      onSwipe(venue, direction);
      setDragX(0);
      setExiting(null);
      const next = index + 1;
      setIndex(next);
      if (next >= venues.length) {
        onExhausted();
      }
    }, EXIT_DURATION_MS);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (exiting) return;
    dragging.current = true;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setDragX(e.clientX - startX.current);
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      handleSwipe(dragX > 0 ? "right" : "left");
    } else {
      setDragX(0);
    }
  }

  if (visible.length === 0) return null;

  return (
    <div className="relative w-full h-full max-w-md mx-auto">
      {visible.map((venue, i) => {
        const isTop = i === 0;
        const matchReason = formatMatchReason(venue);
        const exitTransform =
          isTop && exiting
            ? `translateX(${exiting === "right" ? 600 : -600}px) rotate(${exiting === "right" ? 24 : -24}deg)`
            : isTop
              ? `translateX(${dragX}px) rotate(${dragX / 18}deg)`
              : `translateY(${i * 10}px) scale(${1 - i * 0.04})`;

        return (
          <div
            key={venue.id ?? venue.placeId ?? venue.name}
            className="absolute inset-0 rounded-3xl border border-card-border bg-zinc-900 overflow-hidden select-none"
            style={{
              transform: exitTransform,
              transition: isTop && !dragging.current ? "transform 220ms ease-out" : undefined,
              zIndex: 10 - i,
              touchAction: isTop ? "none" : undefined,
              pointerEvents: isTop ? "auto" : "none",
            }}
            onPointerDown={isTop ? onPointerDown : undefined}
            onPointerMove={isTop ? onPointerMove : undefined}
            onPointerUp={isTop ? onPointerUp : undefined}
            onPointerCancel={isTop ? onPointerUp : undefined}
          >
            {/* Photo fills the entire card — text overlays on top of it
                (Tinder/Hinge convention) instead of living in a separate
                fixed-height panel below, which is what let long venue
                names get clipped before. */}
            {venue.imageUrl ? (
              <img
                src={venue.imageUrl}
                alt={venue.name}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center">
                <Moon className="text-accent" size={48} style={{ opacity: 0.5 }} fill="currentColor" stroke="none" aria-hidden />
              </div>
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 35%, transparent 65%)",
              }}
              aria-hidden
            />

            {isTop && dragX > 40 && (
              <span className="absolute top-6 left-6 text-sm font-bold uppercase tracking-widest text-accent border-2 border-accent rounded-lg px-3 py-1.5 rotate-[-12deg] bg-black/40">
                Interested
              </span>
            )}
            {isTop && dragX < -40 && (
              <span className="absolute top-6 right-6 text-sm font-bold uppercase tracking-widest text-white border-2 border-white rounded-lg px-3 py-1.5 rotate-[12deg] bg-black/40">
                Pass
              </span>
            )}

            {/* Text overlay, anchored to the bottom of the photo. Name is
                line-clamped as a hard safety net — the gradient + bottom
                anchoring already give it room to wrap to 2 lines without
                pushing anything off-card. */}
            <div className="absolute bottom-0 inset-x-0 p-5 pb-28 flex flex-col gap-1.5">
              <p className="font-display font-bold text-3xl leading-tight text-white line-clamp-2">
                {venue.name}
              </p>
              <p className="text-sm text-white/80">
                {venue.type} · {venue.neighborhood}
              </p>
              {venue.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {venue.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/40 font-semibold backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {matchReason && <p className="text-xs text-accent font-semibold mt-1">{matchReason}</p>}
              <p className="text-sm text-accent font-semibold mt-1">{venue.price}</p>
            </div>

            {/* Large, anchored tap targets — sit on the photo itself, not
                floating below the card in empty space. */}
            {isTop && (
              <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-10 z-10">
                <button
                  onClick={() => handleSwipe("left")}
                  disabled={!!exiting}
                  aria-label="Pass"
                  className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform disabled:opacity-40"
                >
                  <X size={28} aria-hidden />
                </button>
                <button
                  onClick={() => handleSwipe("right")}
                  disabled={!!exiting}
                  aria-label="Interested"
                  className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-black active:scale-90 transition-transform disabled:opacity-40"
                >
                  <Heart size={28} fill="currentColor" aria-hidden />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
