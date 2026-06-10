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
}

export interface Vibe {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
}

export interface PrideEvent {
  name: string;
  type: string;
  neighborhood: string;
  date: string;
  time: string;
  description: string;
  price: Price;
  tags: string[];
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
}

export interface ExtractedEventData {
  eventName: string | null;
  date: string | null;
  startTime: string | null;
  venueName: string | null;
  address: string | null;
  price: string | null;
  ticketLink: string | null;
  vibeTags: string[];
}

export interface PendingEvent {
  id?: string;
  event_name: string;
  date: string;
  start_time: string;
  venue_name: string;
  address: string;
  price: string | null;
  ticket_link: string | null;
  vibe_tags: string[];
  image_url: string | null;
  submitter_email: string;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
}
