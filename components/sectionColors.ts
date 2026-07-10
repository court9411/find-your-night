import { Flame, Heart, CircleDollarSign, Sun, LucideIcon } from "lucide-react";

// Literal Tailwind class strings, kept in a scanned directory (tailwind.config.ts's
// content globs don't cover lib/**) so the JIT compiler actually generates these
// utilities — a dynamic `text-${colorClass}` template string here would silently
// produce no CSS. Keyed by RailConfig.colorClass ("accent" | "accent-pink" | ...).
export const SECTION_TEXT_CLASS: Record<string, string> = {
  accent: "text-accent",
  "accent-pink": "text-accent-pink",
  "accent-amber": "text-accent-amber",
  "accent-purple": "text-accent-purple",
};

export function sectionTextClass(colorClass: string): string {
  return SECTION_TEXT_CLASS[colorClass] ?? "text-accent";
}

// RailConfig (lib/homeRails.ts) crosses a JSON API boundary (app/api/home-context),
// so it can't carry a React component reference — that survives JSON.stringify as
// an empty object, not the component. Resolve the icon here instead, client-side,
// keyed by RailConfig.id.
export const RAIL_ICONS: Record<string, LucideIcon> = {
  trending: Flame,
  date_night: Heart,
  budget_friendly: CircleDollarSign,
  daytime_picks: Sun,
};

export function railIcon(id: string): LucideIcon {
  return RAIL_ICONS[id] ?? Flame;
}
