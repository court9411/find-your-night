"use client";

import { useEffect, useState } from "react";
import { readCachedCoords } from "@/lib/geoStorage";
import { LiveDensityVenue, NearbyVenue, SelectedVenue, VenuePin } from "@/lib/checkin";
import { useLocation } from "@/lib/useLocation";
import MapView from "@/components/MapView";
import CheckInVenuePicker from "@/components/CheckInVenuePicker";
import CheckInConfirmVenue from "@/components/CheckInConfirmVenue";
import MapVenueDetailSheet from "@/components/MapVenueDetailSheet";
import CheckInForm from "@/components/CheckInForm";
import CheckInSuccess from "@/components/CheckInSuccess";
import ProactiveCheckInPrompt from "@/components/ProactiveCheckInPrompt";

type Sheet =
  | { name: "closed" }
  | { name: "picker" }
  | { name: "confirm"; venue: NearbyVenue }
  | { name: "info"; venue: SelectedVenue }
  | { name: "checkin"; venue: SelectedVenue }
  | { name: "success"; venue: SelectedVenue };

export default function MapExplorer() {
  const [center] = useState(readCachedCoords);
  const [venues, setVenues] = useState<VenuePin[]>([]);
  const [liveVenues, setLiveVenues] = useState<LiveDensityVenue[]>([]);
  const [focusCoords, setFocusCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sheet, setSheet] = useState<Sheet>({ name: "closed" });
  const [mapError, setMapError] = useState<string | null>(null);
  const [proactiveVenue, setProactiveVenue] = useState<NearbyVenue | null>(null);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/venues/pins")
      .then((res) => (res.ok ? res.json() : { venues: [] }))
      .then((data) => {
        if (!cancelled) setVenues(data.venues ?? []);
      })
      .catch(() => {
        if (!cancelled) setVenues([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll live-density while the Live Map screen is mounted, stop on
  // unmount/tab switch so it doesn't keep hitting the RPC in the background.
  useEffect(() => {
    let cancelled = false;

    function fetchLiveDensity() {
      fetch("/api/venues/live-density")
        .then((res) => (res.ok ? res.json() : { venues: [] }))
        .then((data) => {
          if (!cancelled) setLiveVenues(data.venues ?? []);
        })
        .catch(() => {});
    }

    fetchLiveDensity();
    const interval = setInterval(fetchLiveDensity, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Silent, best-effort check for "user is already standing at a venue" —
  // failures (denied permission, no nearby match) are expected and just
  // mean no prompt, never surfaced as an error like the manual GPS flow.
  useEffect(() => {
    let cancelled = false;
    location
      .request()
      .then((coords) => fetch(`/api/venues/nearby?lat=${coords.lat}&lng=${coords.lng}`))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.venue) setProactiveVenue(data.venue);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshPins() {
    fetch("/api/venues/pins")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setVenues(data.venues ?? []);
      })
      .catch(() => {});
  }

  function focusOnVenueId(id: string) {
    const pin = venues.find((v) => v.id === id);
    if (pin) setFocusCoords({ lat: pin.lat, lng: pin.lng });
  }

  function handlePinClick(venue: VenuePin) {
    setFocusCoords({ lat: venue.lat, lng: venue.lng });
    setSheet({ name: "info", venue: { id: venue.id, name: venue.name, neighborhood: venue.neighborhood } });
  }

  return (
    <div className="relative flex-1 min-h-0">
      <MapView
        venues={venues}
        liveVenues={liveVenues}
        center={center}
        focusCoords={focusCoords}
        onPinClick={handlePinClick}
        onLoadError={setMapError}
      />

      {mapError && (
        <div className="absolute top-4 left-4 right-4 z-30 rounded-xl bg-red-900/80 border border-red-500/40 px-4 py-3 backdrop-blur-sm">
          <p className="text-red-200 text-xs">{mapError}</p>
        </div>
      )}

      <div className="absolute top-4 left-0 right-0 z-30 flex justify-center px-4">
        <button
          onClick={() => setSheet({ name: "picker" })}
          className="rounded-full bg-[#0f0f16]/95 border border-card-border px-5 py-3 min-h-[44px] font-display font-bold text-sm tracking-wide backdrop-blur-md active:scale-95 transition-transform shadow-lg"
        >
          🔍 Find a spot to check in
        </button>
      </div>

      {proactiveVenue && sheet.name === "closed" && (
        <ProactiveCheckInPrompt
          venue={proactiveVenue}
          onCheckIn={() => {
            focusOnVenueId(proactiveVenue.id);
            setSheet({ name: "confirm", venue: proactiveVenue });
            setProactiveVenue(null);
          }}
          onDismiss={() => setProactiveVenue(null)}
        />
      )}

      {sheet.name === "picker" && (
        <SheetOverlay title="Check In" onClose={() => setSheet({ name: "closed" })}>
          <CheckInVenuePicker
            onNearbyMatch={(venue) => {
              focusOnVenueId(venue.id);
              setSheet({ name: "confirm", venue });
            }}
            onSelectVenue={(venue) => {
              focusOnVenueId(venue.id);
              setSheet({ name: "info", venue });
            }}
          />
        </SheetOverlay>
      )}

      {sheet.name === "confirm" && (
        <SheetOverlay title="Check In" onClose={() => setSheet({ name: "closed" })}>
          <CheckInConfirmVenue
            venue={sheet.venue}
            onConfirm={() => setSheet({ name: "checkin", venue: sheet.venue })}
            onNotThis={() => setSheet({ name: "picker" })}
          />
        </SheetOverlay>
      )}

      {sheet.name === "info" && (
        <MapVenueDetailSheet
          venue={sheet.venue}
          onClose={() => setSheet({ name: "closed" })}
          onCheckIn={() => setSheet({ name: "checkin", venue: sheet.venue })}
        />
      )}

      {sheet.name === "checkin" && (
        <SheetOverlay title="Check In" onClose={() => setSheet({ name: "closed" })}>
          <CheckInForm
            venue={sheet.venue}
            onBack={() => setSheet({ name: "info", venue: sheet.venue })}
            onSubmitted={() => {
              refreshPins();
              setSheet({ name: "success", venue: sheet.venue });
            }}
          />
        </SheetOverlay>
      )}

      {sheet.name === "success" && (
        <SheetOverlay title="Check In" onClose={() => setSheet({ name: "closed" })}>
          <CheckInSuccess
            venue={sheet.venue}
            onRefresh={() => setSheet({ name: "checkin", venue: sheet.venue })}
            onDone={() => setSheet({ name: "closed" })}
          />
        </SheetOverlay>
      )}
    </div>
  );
}

function SheetOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-5 pt-12 pb-2">
        <span className="font-display font-bold text-lg tracking-wide">{title}</span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted active:opacity-70"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pt-4">{children}</div>
    </div>
  );
}
