"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import FloatingActionButton from "@/components/FloatingActionButton";
import { BOTTOM_NAV_CONTENT_HEIGHT, TAB_ROUTES } from "@/lib/navConstants";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = TAB_ROUTES.includes(pathname as (typeof TAB_ROUTES)[number]);

  return (
    <>
      {children}
      {showNav && (
        <>
          {/* Sibling spacer (not padding on `children`) so the fixed nav never
              covers the last real content, regardless of each page's own
              bottom padding. */}
          <div
            aria-hidden
            style={{ height: `calc(${BOTTOM_NAV_CONTENT_HEIGHT}px + env(safe-area-inset-bottom))` }}
          />
          <BottomNav />
          <FloatingActionButton />
        </>
      )}
    </>
  );
}
