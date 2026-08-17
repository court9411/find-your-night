"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { BOTTOM_NAV_CONTENT_HEIGHT } from "@/lib/navConstants";

/**
 * Links to /submit, which itself offers both "Submit Event" (primary) and
 * "Add a venue" (secondary link on that page) — "Submit" is the label that
 * covers both without overclaiming a scope (check-in, posting) this button
 * doesn't have. A bare "+" tested as ambiguous; the label removes the guess.
 */
export default function FloatingActionButton() {
  return (
    <Link
      href="/submit"
      aria-label="Submit an event or venue"
      className="fixed z-40 flex items-center gap-1.5 h-12 pl-3.5 pr-4 rounded-full bg-accent text-black shadow-lg shadow-black/50 active:scale-95 transition-transform"
      style={{
        right: "1.25rem",
        bottom: `calc(${BOTTOM_NAV_CONTENT_HEIGHT}px + env(safe-area-inset-bottom) + 16px)`,
      }}
    >
      <Plus size={20} strokeWidth={2.5} aria-hidden />
      <span className="font-display font-bold text-sm tracking-wide">Submit</span>
    </Link>
  );
}
