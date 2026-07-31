"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { TonightRailItem } from "@/lib/tonightRail";
import { readCachedCoords } from "@/lib/geoStorage";
import { createClient } from "@/lib/supabase/client";
import { getAnonId } from "@/lib/anon";
import TonightCard from "@/components/TonightCard";
import PicksLink from "@/components/PicksLink";

const FULL_LIST_LIMIT = 60;

/**
 * Full listing for the Tonight rail — same get_tonight_rail RPC
 * app/results/page.tsx's summary rail uses (via /api/rank/tonight), just
 * with a much higher limit, so the two never disagree on what "tonight"
 * means. Static "/rail/tonight" route takes precedence over the sibling
 * "/rail/[id]" dynamic route for venue-only rails — Tonight's mixed
 * event/venue shape doesn't fit that page's Venue-only contract.
 */
export default function TonightRailListingPage() {
  const [items, setItems] = useState<TonightRailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [precise, setPrecise] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!cancelled) setUserId(user?.id ?? null);
    }
    loadUser();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchTonight() {
      const coords = readCachedCoords();
      if (cancelled) return;
      setPrecise(coords.precise);
      try {
        const res = await fetch("/api/rank/tonight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, anonId: getAnonId(), lat: coords.lat, lng: coords.lng, limit: FULL_LIST_LIMIT }),
        });
        if (cancelled) return;
        if (!res.ok) {
          setItems([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) setItems(data.items ?? []);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load Tonight rail listing:", err);
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTonight();
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <main className="flex flex-col items-center min-h-screen py-12 gap-6">
      <div className="flex items-center justify-between w-full max-w-md px-6">
        <h1 className="font-display font-extrabold text-3xl tracking-tight flex items-center gap-2">
          <Zap className="text-accent fill-current" size={24} aria-hidden />
          Tonight
        </h1>
        <PicksLink className="text-sm text-muted underline underline-offset-4">
          Back
        </PicksLink>
      </div>

      {loading && (
        <div className="flex flex-wrap gap-3.5 w-full max-w-md px-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex-none w-44 h-44 glass-card rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-muted text-sm px-6">Nothing happening tonight yet — check back soon.</p>
      )}

      {!loading && items.length > 0 && (
        <div className="flex flex-wrap gap-3.5 w-full max-w-md px-6">
          {items.map((item) => (
            <TonightCard key={`${item.itemType}-${item.id}`} item={item} userId={userId} showDistance={precise} />
          ))}
        </div>
      )}
    </main>
  );
}
