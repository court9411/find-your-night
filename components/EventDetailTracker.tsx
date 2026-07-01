"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

interface Props {
  eventId: string;
  eventName: string;
  vibeTags: string[];
}

export default function EventDetailTracker({ eventId, eventName, vibeTags }: Props) {
  useEffect(() => {
    track("event_detail_viewed", { event_id: eventId, event_name: eventName, vibe_tags: vibeTags });
  }, [eventId, eventName, vibeTags]);

  return null;
}
