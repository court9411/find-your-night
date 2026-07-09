import { VisitRating } from "@/lib/visitSurvey";

export interface NightHistoryItem {
  id: string;
  venueName: string;
  rating: VisitRating | null;
  date: string; // event date if linked, else the visit's created_at date
}

export interface SavedNightItem {
  id: string;
  type: "event" | "venue";
  targetId: string; // pending_events.id for events, venues.id (not place_id) for venues — matches the /venue/[id] route
  name: string;
  neighborhood: string | null;
  date: string | null;
  imageUrl: string | null;
  createdAt: string;
}
