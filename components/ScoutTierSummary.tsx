import { ScoutStats } from "@/lib/checkin";

// Shared tier/progress text block — used by the check-in form (before
// submitting) and the Profile page's Scout Status card, so the two never
// describe tier progress differently.
export default function ScoutTierSummary({ stats }: { stats: ScoutStats }) {
  return (
    <div className="rounded-xl bg-accent/10 border border-accent/20 px-4 py-3">
      <p className="text-sm font-semibold text-accent">
        {stats.tier} · {stats.checkinCount} check-in{stats.checkinCount === 1 ? "" : "s"}
      </p>
      {stats.progress && (
        <p className="text-xs text-muted mt-0.5">
          {stats.progress.remaining} more to reach {stats.progress.nextTier}
        </p>
      )}
    </div>
  );
}
