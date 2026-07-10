import { Moon } from "lucide-react";

/**
 * Persistent brand header shown above content on all 3 tabs (Picks, Live
 * Map, Profile) — mounted by AppShell alongside BottomNav so both share the
 * same TAB_ROUTES gating. Solid-fill green moon at compact size; the full
 * neon-glow lockup is the marketing mark, not a fit for a 20px header.
 */
export default function AppHeader() {
  return (
    <header
      className="flex items-center gap-2 px-5 pb-3 border-b border-card-border"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
    >
      <Moon className="text-accent" size={20} fill="currentColor" stroke="none" aria-hidden />
      <span className="font-display font-bold text-[12px] tracking-[0.2em] text-foreground/90">
        FIND YOUR NIGHT
      </span>
    </header>
  );
}
