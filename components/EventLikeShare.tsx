"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { getAnonId } from "@/lib/anon";

const LIKED_EVENTS_KEY = "fyn:likedEvents";

function getLikedEventIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LIKED_EVENTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

interface EventLikeShareProps {
  eventId: string;
  eventName: string;
  initialLikeCount: number;
}

export default function EventLikeShare({ eventId, eventName, initialLikeCount }: EventLikeShareProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    setLiked(getLikedEventIds().includes(eventId));
  }, [eventId]);

  async function handleLike() {
    if (liked || liking) return;
    setLiking(true);
    try {
      const res = await fetch(`/api/events/${eventId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId: getAnonId() }),
      });
      const data = await res.json();
      if (res.ok) {
        setLikeCount(data.likeCount);
        setLiked(true);
        const likedIds = getLikedEventIds();
        localStorage.setItem(LIKED_EVENTS_KEY, JSON.stringify([...likedIds, eventId]));
        track("event_liked", { event_id: eventId, event_name: eventName, total_likes: data.likeCount });
      }
    } catch {
      // silently ignore — like is non-critical
    } finally {
      setLiking(false);
    }
  }

  async function handleShare() {
    const shareData = { title: eventName, url: window.location.href };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        track("event_shared", { event_id: eventId, event_name: eventName, share_method: "native" });
      } catch {
        // user cancelled share
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      track("event_shared", { event_id: eventId, event_name: eventName, share_method: "clipboard" });
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-3">
        <button
          onClick={handleLike}
          disabled={liked || liking}
          className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold active:scale-95 transition-all ${
            liked
              ? "bg-accent text-black"
              : "bg-accent/20 border border-accent/30 text-accent disabled:opacity-60"
          }`}
        >
          <span key={liked ? "liked" : "unliked"} className={liked ? "animate-saveBounce" : ""}>
            {liked ? "❤️" : "🤍"}
          </span>
          <span key={likeCount} className={liked ? "animate-saveBounce" : ""}>
            {likeCount > 0 ? likeCount : "Like"}
          </span>
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-card-border py-3 text-sm font-semibold text-muted active:scale-95 transition-transform"
        >
          <span>📤</span>
          <span>{shared ? "Copied!" : "Share"}</span>
        </button>
      </div>
      <p className="text-[11px] text-muted/50 text-center">
        We&apos;ll use likes to help rank events — tap the bookmark above to save this to your profile.
      </p>
    </div>
  );
}
