"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, User, LucideIcon } from "lucide-react";
import { BOTTOM_NAV_CONTENT_HEIGHT } from "@/lib/navConstants";
import { usePicksHref } from "@/lib/usePicksHref";

interface Tab {
  href: string;
  icon: LucideIcon;
  label: string;
}

const TABS: Tab[] = [
  { href: "/results", icon: Home, label: "Picks" },
  { href: "/map", icon: Map, label: "Live Map" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const picksHref = usePicksHref();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-card-border bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="flex items-stretch justify-around max-w-md mx-auto"
        style={{ minHeight: BOTTOM_NAV_CONTENT_HEIGHT }}
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const href = tab.href === "/results" ? picksHref : tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] active:opacity-70"
            >
              <Icon
                className={active ? "text-accent" : "text-muted"}
                size={22}
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden
              />
              <span className={`text-[11px] font-semibold ${active ? "text-accent" : "text-muted"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
