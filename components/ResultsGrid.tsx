import { Venue } from "@/lib/types";
import VenueCard from "./VenueCard";

interface ResultsGridProps {
  venues: Venue[];
}

export default function ResultsGrid({ venues }: ResultsGridProps) {
  if (venues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[40vh] text-center">
        <span className="text-5xl">🌙</span>
        <p className="text-muted">No spots found. Try a different vibe or city.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      {venues.map((venue, i) => (
        <VenueCard key={`${venue.name}-${i}`} venue={venue} index={i} />
      ))}
    </div>
  );
}
