"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, Sparkle } from "lucide-react";
import { TonightRailItem } from "@/lib/tonightRail";
import { getAnonId } from "@/lib/anon";
import TonightCard from "@/components/TonightCard";

const TONIGHT_LIMIT = 10;

interface Props {
  userId: string | null;
  lat?: number | null;
  lng?: number | null;
  precise?: boolean;
}

/**
 * Events-first "Tonight" rail — real events happening tonight
 * (get_tonight_rail Stage A), backfilled with live-density-ranked venues
 * only when tonight's event count is thin (Stage B). Mixed item types in
 * one rail, one "See more" (app/rail/tonight/page.tsx uses the same RPC
 * with a higher limit so the summary and expanded view never disagree).
 * Self-hides on empty/error, same convention as every other rail here.
 */
export default function TonightRail({ userId, lat = null, lng = null, precise = false }: Props) {
  const [items, setItems] = useState<TonightRailItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchTonight() {
      try {
        const res = await fetch("/api/rank/tonight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, anonId: getAnonId(), lat, lng, limit: TONIGHT_LIMIT }),
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
          console.error("Failed to load Tonight rail:", err);
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTonight();
    return () => {
      cancelled = true;
    };
  }, [userId, lat, lng]);

  if (loading) {
    return (
      <div>
        <div className="h-5 w-32 bg-white/10 rounded-full animate-pulse mb-3 mx-5" />
        <div className="flex gap-3.5 overflow-hidden px-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex-none w-44 h-44 glass-card rounded-2xl animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="px-5 mb-3 flex items-center gap-2">
        <Zap className="text-accent fill-current shrink-0" size={18} aria-hidden />
        <span className="font-script text-neon-pink text-2xl leading-none">Happening Now</span>
        <span
          className="flex-1 h-px bg-gradient-to-r from-accent-pink/70 to-transparent"
          style={{ boxShadow: "0 0 6px rgba(255,61,187,0.6)" }}
          aria-hidden
        />
        <Sparkle className="text-accent fill-current shrink-0" size={14} stroke="none" aria-hidden />
        <Link href="/rail/tonight" className="text-accent text-xs font-medium shrink-0">
          See more →
        </Link>
      </h3>
      <div
        className="flex gap-3.5 overflow-x-auto px-5 pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((item) => (
          <TonightCard key={`${item.itemType}-${item.id}`} item={item} userId={userId} showDistance={precise} />
        ))}
      </div>
    </div>
  );
}
