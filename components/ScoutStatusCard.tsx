"use client";

import { useEffect, useState } from "react";
import { ScoutStats } from "@/lib/checkin";
import ScoutTierSummary from "@/components/ScoutTierSummary";

interface Props {
  isFoundingScout: boolean;
}

export default function ScoutStatusCard({ isFoundingScout }: Props) {
  const [stats, setStats] = useState<ScoutStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/checkins/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setStats(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl glass-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-xl tracking-tight">Scout Status</h2>
        {isFoundingScout && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/30 font-body font-semibold shrink-0">
            🌟 Founding Scout
          </span>
        )}
      </div>

      {stats ? (
        <ScoutTierSummary stats={stats} />
      ) : (
        <div className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
      )}
    </section>
  );
}
