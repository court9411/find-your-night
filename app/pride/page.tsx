import Link from "next/link";
import PrideEventCard from "@/components/PrideEventCard";
import { PrideEvent } from "@/lib/types";

const PRIDE_EVENTS: PrideEvent[] = [
  {
    name: "Cincinnati Pride Parade",
    type: "Parade",
    neighborhood: "Starts at 7th & Central",
    date: "Saturday, June 27",
    time: "11:00 AM",
    description:
      "The signature event of Cincinnati Pride weekend — floats, marching groups, and crowds lining the route through downtown.",
    price: "$",
    tags: ["Parade", "Family Friendly", "Downtown"],
  },
  {
    name: "Pride Festival at Sawyer Point",
    type: "Festival",
    neighborhood: "Sawyer Point Park",
    date: "Saturday, June 27",
    time: "12:00 PM – 8:00 PM",
    description:
      "A free riverside festival with vendors, performances, food trucks, and community organizations celebrating Pride.",
    price: "$",
    tags: ["Free", "Outdoors", "All Ages"],
  },
  {
    name: "Cincinnati Magazine Pride Party",
    type: "Party",
    neighborhood: "Elm Street Plaza",
    date: "Friday, June 26",
    time: "Evening",
    description:
      "Kick off Pride weekend with this lively party featuring music, drinks, and the city's nightlife crowd in one spot.",
    price: "$$",
    tags: ["Nightlife", "21+", "Music"],
  },
];

export default function PridePage() {
  return (
    <main className="flex flex-col items-center min-h-screen px-6 py-12 gap-6">
      <div className="flex items-center justify-between w-full max-w-md">
        <h1 className="font-display text-4xl tracking-wide">
          🏳️‍🌈 Pride Weekend
        </h1>
        <Link href="/" className="text-sm text-muted underline underline-offset-4">
          Home
        </Link>
      </div>
      <p className="text-muted text-sm w-full max-w-md -mt-4">
        Cincinnati Pride · June 26–28
      </p>

      <div className="flex flex-col gap-4 w-full max-w-md">
        {PRIDE_EVENTS.map((event, i) => (
          <PrideEventCard key={event.name} event={event} index={i} />
        ))}
      </div>

      <Link
        href="/submit"
        className="rounded-2xl glass-card font-display text-xl tracking-wide px-8 py-3 transition-transform active:scale-95 hover:border-accent/50"
      >
        Submit a Pride Event
      </Link>
    </main>
  );
}
