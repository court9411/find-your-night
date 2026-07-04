"use client";

import { useSaveState } from "@/lib/useSaveState";
import SaveAuthModal from "@/components/SaveAuthModal";

interface SaveButtonProps {
  itemType: "event" | "venue";
  itemId: string;
  scoringTargetId?: string;
  className?: string;
}

export default function SaveButton({ itemType, itemId, scoringTargetId, className = "" }: SaveButtonProps) {
  const { saved, loading, justSaved, showAuthModal, toggle, handleAuthed, closeAuthModal } =
    useSaveState(itemType, itemId, scoringTargetId);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  }

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        onClick={handleClick}
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
        <SaveAuthModal onClose={closeAuthModal} onAuthed={handleAuthed} />
      )}
    </div>
  );
}
