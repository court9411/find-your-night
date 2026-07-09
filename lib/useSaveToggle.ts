"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { logAction } from "@/lib/track-action";
import { getAnonId } from "@/lib/anon";

interface UseSaveToggleParams {
  /** The id this specific save/unsave targets — event id or venue place_id. */
  itemId: string;
  isSaved: () => Promise<boolean>;
  save: () => Promise<void>;
  unsave: () => Promise<void>;
  scoringTargetType: "event" | "venue";
  scoringTargetId?: string;
}

/**
 * Shared auth/optimistic-update/loading state machine behind useSaveEvent
 * and useSaveVenue — not exported for direct use. The two entity-specific
 * hooks own *which* save/unsave/isSaved functions get called; this owns the
 * UI-state plumbing that's identical either way, so that isn't duplicated
 * per entity type.
 */
export function useSaveToggle({ itemId, isSaved, save, unsave, scoringTargetType, scoringTargetId }: UseSaveToggleParams) {
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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

      try {
        const isItemSaved = await isSaved();
        if (!cancelled) setSaved(isItemSaved);
      } catch (err) {
        console.error("Failed to check saved state:", err);
      }
    }
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  async function performSave(next: boolean) {
    setSaved(next); // optimistic
    setLoading(true);

    try {
      if (next) {
        await save();
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1800);

        if (scoringTargetId) {
          logAction({ userId, anonId: getAnonId(), targetType: scoringTargetType, targetId: scoringTargetId, actionType: "saved" });
        }
      } else {
        await unsave();
      }
    } catch (err) {
      // Surfaced, not swallowed — a failed save reverting silently with no
      // trace is exactly what made this class of bug hard to pin down.
      console.error(`Failed to ${next ? "save" : "unsave"} ${scoringTargetType} ${itemId}:`, err);
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
