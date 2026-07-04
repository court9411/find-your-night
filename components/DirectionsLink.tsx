"use client";

import { useState } from "react";
import { logAction } from "@/lib/track-action";
import { getAnonId } from "@/lib/anon";
import MapsChoiceSheet from "@/components/MapsChoiceSheet";

interface Props {
  targetType: "event" | "venue";
  targetId?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  userId?: string | null;
  className?: string;
}

export default function DirectionsLink({
  targetType,
  targetId,
  address,
  lat,
  lng,
  userId,
  className = "flex items-start gap-2 text-sm text-accent underline underline-offset-4",
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!address && (lat == null || lng == null)) return null;

  function logClick() {
    if (!targetId) return;
    logAction({ userId, anonId: getAnonId(), targetType, targetId, actionType: "directions_clicked" });
  }

  function handleClick() {
    const isAndroid = /Android/.test(navigator.userAgent);
    if (isAndroid) {
      logClick();
      const href =
        lat != null && lng != null
          ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address!)}`;
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    setSheetOpen(true);
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        <span aria-hidden>📍</span>
        <span>{address ?? "Get Directions"}</span>
      </button>
      <MapsChoiceSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        address={address}
        lat={lat}
        lng={lng}
        onChoose={logClick}
      />
    </>
  );
}
