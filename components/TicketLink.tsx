"use client";

import { track } from "@/lib/analytics";

interface Props {
  href: string;
  eventId: string;
  eventName: string;
  hasPrice: boolean;
}

export default function TicketLink({ href, eventId, eventName, hasPrice }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-accent underline underline-offset-4"
      onClick={() => track("ticket_link_clicked", { event_id: eventId, event_name: eventName, has_price: hasPrice })}
    >
      Tickets / Details
    </a>
  );
}
