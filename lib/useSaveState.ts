"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { logAction } from "@/lib/track-action";
import { getAnonId } from "@/lib/anon";

type ItemType = "event" | "venue";

export function useSaveState(itemType: ItemType, itemId: string, scoringTargetId?: string) {
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Check auth and existing save state whenever the item changes
  useEffect(() => {
    let cancelled = false;
    setSaved(false); // avoid flashing the previous item's saved state

    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setUserId(null);
        return;
      }
      setUserId(user.id);

      const res = await fetch(`/api/interactions?type=saved&itemType=${itemType}`);
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
        const res = await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType, itemId, interactionType: "saved" }),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1800);

        const targetId = scoringTargetId ?? (itemType === "event" ? itemId : undefined);
        if (targetId) {
          logAction({ userId, anonId: getAnonId(), targetType: itemType, targetId, actionType: "saved" });
        }
      } else {
        const res = await fetch("/api/interactions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType, itemId }),
        });
        if (!res.ok) throw new Error(`Unsave failed: ${res.status}`);
      }
    } catch {
      setSaved(!next); // revert — the server never confirmed the change
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
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

  return {
    saved,
    loading,
    justSaved,
    showAuthModal,
    userId,
    toggle,
    handleAuthed,
    closeAuthModal: () => setShowAuthModal(false),
  };
}
