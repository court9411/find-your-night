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
