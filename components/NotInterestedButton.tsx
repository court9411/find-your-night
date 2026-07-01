"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface NotInterestedButtonProps {
  itemType: "event" | "venue";
  itemId: string;
  onConfirm?: () => void;
  children: React.ReactNode;
}

const LONG_PRESS_MS = 650;

export default function NotInterestedButton({
  itemType,
  itemId,
  onConfirm,
  children,
}: NotInterestedButtonProps) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function startPress() {
    timerRef.current = setTimeout(() => setShowOverlay(true), LONG_PRESS_MS);
  }

  function cancelPress() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  async function handleNotInterested() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setShowOverlay(false);
      router.push("/login");
      return;
    }

    setSubmitting(true);
    try {
      await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId, interactionType: "not_interested" }),
      });
      setShowOverlay(false);
      onConfirm?.();
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="relative"
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
    >
      {children}

      {showOverlay && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/80 backdrop-blur-sm">
          <button
            onClick={handleNotInterested}
            disabled={submitting}
            className="rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white active:scale-95 transition-transform disabled:opacity-50"
          >
            {submitting ? "Done…" : "Not interested"}
          </button>
          <button
            onClick={() => setShowOverlay(false)}
            className="text-xs text-muted/60"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
