export type Price = "$" | "$$" | "$$$";

export interface Venue {
  id?: string | null;
  name: string;
  type: string;
  neighborhood: string;
  description: string;
  whyTonight: string;
  price: Price;
  tags: string[];
  featured?: boolean;
  lat?: number | null;
  lng?: number | null;
  distanceMiles?: number;
  imageUrl?: string | null;
  photoAttribution?: { name: string | null; uri: string | null } | null;
  eventDate?: string | null;
  eventTime?: string | null;
  blackOwned?: boolean | null;
  source?: string;
  address?: string | null;
  hours?: string | null;
  happyHour?: string | null;
  isOpenNow?: boolean | null;
  hoursStatus?: { text: string; closingSoon: boolean } | null;
  placeId?: string | null;
  liveTonight?: { id: string; eventName: string; startDt: string } | null;
  matchedTags?: string[] | null;
  budgetMatch?: boolean | null;
  distanceMi?: number | null;
  venueCategory?: string | null;
  /** Raw 0-1ish score from get_ranked_venues, before any percentage framing
   * — only get_ranked_venues sets this (get_rail_venues doesn't return a
   * comparable score), so it's null for rail-sourced venues. */
  finalScore?: number | null;
  /** Matching vibe_tag text when one contains today's Cincinnati weekday
   * (e.g. "Taco Tuesday" on a Tuesday) — see lib/dailySpecials.ts. Only the
   * main Tonight rail (app/api/rank/venues) computes this. */
  dailySpecial?: string | null;
}

export interface FeaturedVenueEvent {
  id: string;
  name: string;
  description: string;
  tags: string[];
  imageUrl: string | null;
  startDt: string;
  endDt: string;
  ticketLink: string | null;
}

export interface Vibe {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
  gradient?: string;
  glow?: string;
}

export interface SubmissionPayload {
  venueName: string;
  type: string;
  neighborhood: string;
  city: string;
  state?: string | null;
  dateTime: string;
  description: string;
  vibeTags: string;
  contactEmail: string;
  lat?: number | null;
  lng?: number | null;
}

export interface ExtractedEventData {
  eventName: string | null;
  date: string | null;
  startTime: string | null;
  endTime?: string | null;
  venueName: string | null;
  address: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  description?: string | null;
  price: string | null;
  ticketLink: string | null;
  vibeTags: string[];
  lat?: number | null;
  lng?: number | null;
  isPrivateLocation?: boolean;
  privateLocationNote?: string | null;
  isRecurring?: boolean;
  recurrenceFrequency?: import("./recurrence").RecurrenceFrequency | null;
  recurrenceDays?: string[];
  recurrenceEndDate?: string | null;
}

export interface PendingEvent {
  id?: string;
  event_name: string;
  date: string;
  start_time: string;
  end_time?: string | null;
  venue_name: string;
  venue_id?: string | null;
  address: string;
  neighborhood?: string | null;
  city: string;
  state: string | null;
  description?: string | null;
  price: string | null;
  ticket_link: string | null;
  vibe_tags: string[];
  image_url: string | null;
  submitter_email: string;
  status: "pending" | "approved" | "rejected";
  display_order: number;
  featured: boolean;
  category: string | null;
  lat: number | null;
  lng: number | null;
  is_private_location: boolean;
  private_location_note: string | null;
  like_count: number;
  created_at?: string;
  is_recurring?: boolean | null;
  recurrence_frequency?: import("./recurrence").RecurrenceFrequency | null;
  recurrence_days?: string[] | null;
  recurrence_end_date?: string | null;
  parent_event_id?: string | null;
}
