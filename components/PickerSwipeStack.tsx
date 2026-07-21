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
 * Tinder-style swipeable card stack — plain Pointer Events, no gesture
 * library (none is installed and only ~3 cards are ever in play). Top card
 * drags with the pointer; released past SWIPE_THRESHOLD animates off and
 * fires onSwipe, otherwise snaps back. X/heart buttons drive the same
 * handleSwipe path for non-drag input.
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
      if (next >= venues.length) onExhausted();
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
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-full max-w-sm h-[26rem]">
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
              className="absolute inset-0 rounded-3xl border border-card-border bg-card overflow-hidden select-none"
              style={{
                transform: exitTransform,
                transition: isTop && !dragging.current ? "transform 220ms ease-out" : undefined,
                zIndex: 10 - i,
                touchAction: isTop ? "none" : undefined,
              }}
              onPointerDown={isTop ? onPointerDown : undefined}
              onPointerMove={isTop ? onPointerMove : undefined}
              onPointerUp={isTop ? onPointerUp : undefined}
              onPointerCancel={isTop ? onPointerUp : undefined}
            >
              <div className="relative w-full h-56">
                {venue.imageUrl ? (
                  <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" draggable={false} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center">
                    <Moon className="text-accent" size={36} style={{ opacity: 0.5 }} fill="currentColor" stroke="none" aria-hidden />
                  </div>
                )}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent 55%)" }}
                  aria-hidden
                />
                {isTop && dragX > 40 && (
                  <span className="absolute top-4 left-4 text-xs font-bold uppercase tracking-widest text-accent border-2 border-accent rounded-lg px-2 py-1 rotate-[-12deg]">
                    Interested
                  </span>
                )}
                {isTop && dragX < -40 && (
                  <span className="absolute top-4 right-4 text-xs font-bold uppercase tracking-widest text-muted border-2 border-muted rounded-lg px-2 py-1 rotate-[12deg]">
                    Pass
                  </span>
                )}
              </div>
              <div className="p-5 flex flex-col gap-1.5">
                <p className="font-display font-bold text-2xl tracking-wide leading-tight">{venue.name}</p>
                <p className="text-sm text-muted">
                  {venue.type} · {venue.neighborhood}
                </p>
                {venue.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {venue.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/30 font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {matchReason && <p className="text-xs text-accent font-semibold mt-1">{matchReason}</p>}
                <p className="text-sm text-accent font-semibold mt-1">{venue.price}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={() => handleSwipe("left")}
          disabled={!!exiting}
          aria-label="Pass"
          className="w-14 h-14 rounded-full border border-card-border flex items-center justify-center text-muted active:scale-90 transition-transform disabled:opacity-40"
        >
          <X size={24} aria-hidden />
        </button>
        <button
          onClick={() => handleSwipe("right")}
          disabled={!!exiting}
          aria-label="Interested"
          className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-black active:scale-90 transition-transform disabled:opacity-40"
        >
          <Heart size={24} fill="currentColor" aria-hidden />
        </button>
      </div>
    </div>
  );
}
