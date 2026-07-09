import Link from "next/link";
import { BUDGET_OPTIONS } from "@/lib/preferenceOptions";

interface Props {
  vibePrefs: string[];
  musicPrefs: string[];
  priceLevels: number[];
}

export default function TasteSummaryCard({ vibePrefs, musicPrefs, priceLevels }: Props) {
  const budgetLabels = BUDGET_OPTIONS.filter((o) => priceLevels.includes(o.value)).map((o) => o.label);
  const hasAnyTaste = vibePrefs.length > 0 || musicPrefs.length > 0 || budgetLabels.length > 0;

  return (
    <section className="rounded-2xl glass-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-xl tracking-tight">Your Taste</h2>
        <Link href="/profile/edit" className="text-xs text-accent font-semibold underline underline-offset-4 shrink-0">
          Edit Taste →
        </Link>
      </div>

      {!hasAnyTaste ? (
        <p className="text-muted text-sm">Tell us your vibe to get sharper picks.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {vibePrefs.map((tag) => (
            <span
              key={`vibe-${tag}`}
              className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/30 font-semibold"
            >
              {tag}
            </span>
          ))}
          {musicPrefs.map((tag) => (
            <span
              key={`music-${tag}`}
              className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] border border-card-border text-white font-semibold"
            >
              {tag}
            </span>
          ))}
          {budgetLabels.map((label) => (
            <span
              key={`budget-${label}`}
              className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] border border-card-border text-muted font-semibold"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
