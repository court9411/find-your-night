"use client";

import { useEffect, useState } from "react";
import {
  CheckedInTonightItem,
  fetchCheckedInTonight,
  formatIdentityName,
  formatIdentityTimeLabel,
  initialsFromName,
} from "@/lib/supabase/identity";
import { crowdLevelLabel, CrowdLevel } from "@/lib/checkin";

interface Props {
  venueId: string | null | undefined;
  hoursBack?: number;
}

function Avatar({ item, size }: { item: CheckedInTonightItem; size: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="shrink-0 overflow-hidden rounded-full border-2 border-background bg-accent/20 flex items-center justify-center"
    >
      {item.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display font-bold text-accent" style={{ fontSize: Math.round(size * 0.38) }}>
          {initialsFromName(item.display_name)}
        </span>
      )}
    </div>
  );
}

export default function CheckedInTonight({ venueId, hoursBack = 2 }: Props) {
  const [checkins, setCheckins] = useState<CheckedInTonightItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!venueId) {
      setCheckins([]);
      return;
    }
    let cancelled = false;
    fetchCheckedInTonight(venueId, hoursBack)
      .then((data) => {
        if (!cancelled) setCheckins(data);
      })
      .catch(() => {
        if (!cancelled) setCheckins([]);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId, hoursBack]);

  // Additive to the density signal — no check-ins in the window means no block
  // at all, not an empty state.
  if (checkins.length === 0) return null;

  const stack = checkins.slice(0, 3);
  const extra = checkins.length - stack.length;
  const others = checkins.length - 1;

  return (
    <div className="rounded-xl border border-card-border bg-card px-4 py-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 active:opacity-80"
      >
        <div className="flex -space-x-2">
          {stack.map((c) => (
            <Avatar key={c.checkin_id} item={c} size={32} />
          ))}
          {extra > 0 && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background bg-white/[0.08] text-[11px] font-bold text-white">
              +{extra}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Checked in tonight</p>
          <p className="truncate text-sm text-white">
            {formatIdentityName(checkins[0].display_name)}
            {others > 0 && ` & ${others} other${others > 1 ? "s" : ""}`}
          </p>
        </div>
        <span aria-hidden className="text-xs text-muted">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-3 border-t border-card-border pt-3">
          {checkins.map((c) => {
            const crowd = c.crowd_level ? crowdLevelLabel(c.crowd_level as CrowdLevel) : "";
            return (
              <div key={c.checkin_id} className="flex items-center gap-3">
                <Avatar item={c} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {formatIdentityName(c.display_name)}
                    </p>
                    {c.is_scout && (
                      <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                        Scout
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted">
                    {crowd && `${crowd} · `}
                    {formatIdentityTimeLabel(new Date(c.created_at))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
