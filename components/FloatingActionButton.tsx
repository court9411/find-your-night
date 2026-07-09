"use client";

import Link from "next/link";
import { BOTTOM_NAV_CONTENT_HEIGHT } from "@/lib/navConstants";

export default function FloatingActionButton() {
  return (
    <Link
      href="/submit"
      aria-label="Submit an event"
      className="fixed z-40 flex items-center justify-center w-14 h-14 rounded-full bg-accent text-black shadow-lg shadow-black/50 active:scale-95 transition-transform"
      style={{
        right: "1.25rem",
        bottom: `calc(${BOTTOM_NAV_CONTENT_HEIGHT}px + env(safe-area-inset-bottom) + 16px)`,
      }}
    >
      <span className="text-3xl leading-none font-semibold" aria-hidden>
        +
      </span>
    </Link>
  );
}
