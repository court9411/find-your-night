"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SaveAuthModal from "@/components/SaveAuthModal";
import type { User } from "@supabase/supabase-js";

interface SaveButtonProps {
  itemType: "event" | "venue";
  itemId: string;
  className?: string;
}

export default function SaveButton({ itemType, itemId, className = "" }: SaveButtonProps) {
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  async function performSave(next: boolean) {
    setSaved(next); // optimistic
    setLoading(true);

    try {
      if (next) {
        await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType, itemId, interactionType: "saved" }),
        });
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1800);
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

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    if (!userId) {
      setShowAuthModal(true);
      return;
    }

    performSave(!saved);
  }

  function handleAuthed(user: User) {
    setUserId(user.id);
    setShowAuthModal(false);
    performSave(true);
  }

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={saved ? "Unsave" : "Save"}
        aria-pressed={saved}
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-200 active:scale-90 ${
          saved
            ? "bg-accent/15 text-accent"
            : "text-muted/50 hover:text-muted hover:bg-white/5"
        }`}
      >
        <svg
          key={saved ? "saved" : "unsaved"}
          className={`w-5 h-5 ${saved ? "animate-saveBounce" : ""}`}
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

      {justSaved && (
        <span className="pointer-events-none absolute top-full left-1/2 mt-1.5 whitespace-nowrap text-[11px] font-semibold text-accent bg-black/90 border border-accent/30 rounded-full px-2.5 py-1 animate-toastPop z-10">
          Saved ✓
        </span>
      )}

      {showAuthModal && (
        <SaveAuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthed={handleAuthed}
        />
      )}
    </div>
  );
}
