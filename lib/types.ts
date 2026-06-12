export type Price = "$" | "$$" | "$$$";

export interface Venue {
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
  imageUrl?: string | null;
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
  venueName: string | null;
  address: string | null;
  neighborhood?: string | null;
  city?: string | null;
  price: string | null;
  ticketLink: string | null;
  vibeTags: string[];
  lat?: number | null;
  lng?: number | null;
}

export interface PendingEvent {
  id?: string;
  event_name: string;
  date: string;
  start_time: string;
  venue_name: string;
  address: string;
  neighborhood?: string | null;
  city?: string | null;
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
  created_at?: string;
}
