"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SaveButtonProps {
  itemType: "event" | "venue";
  itemId: string;
  className?: string;
}

export default function SaveButton({ itemType, itemId, className = "" }: SaveButtonProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check auth and existing save state on mount
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setUserId(user.id);

      // Check if already saved
      const res = await fetch(
        `/api/interactions?type=saved&itemType=${itemType}`
      );
      if (cancelled || !res.ok) return;
      const json = await res.json();
      const items: Array<{ event_id?: string; place_id?: string }> = json.items ?? [];
      const isSaved = items.some((item) =>
        itemType === "event" ? item.event_id === itemId : item.place_id === itemId
      );
      setSaved(isSaved);
    }
    init();
    return () => { cancelled = true; };
  }, [itemType, itemId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      router.push("/login");
      return;
    }

    const next = !saved;
    setSaved(next); // optimistic
    setLoading(true);

    try {
      if (next) {
        await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType, itemId, interactionType: "saved" }),
        });
      } else {
        await fetch("/api/interactions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType, itemId }),
        });
      }
    } catch {
      setSaved(!next); // revert on error
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? "Unsave" : "Save"}
      className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors active:scale-90 ${
        saved
          ? "text-accent"
          : "text-muted/50 hover:text-muted"
      } ${className}`}
    >
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
