"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";
import ResultsGrid from "@/components/ResultsGrid";
import { Venue } from "@/lib/types";

function ResultsContent() {
  const params = useSearchParams();
  const router = useRouter();

  const city = params.get("city") ?? "";
  const vibe = params.get("vibe") ?? "";
  const label = params.get("label") ?? "Your Vibe";
  const emoji = params.get("emoji") ?? "🌙";

  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!city || !vibe) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    async function fetchVenues() {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city, vibe }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error ?? "Something went wrong");
        }

        if (!cancelled) {
          setVenues(data.venues ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      }
    }

    fetchVenues();
    return () => {
      cancelled = true;
    };
  }, [city, vibe, router]);

  return (
    <main className="flex flex-col items-center min-h-screen px-6 py-12 gap-6">
      <div className="flex items-center justify-between w-full max-w-md">
        <h1 className="font-display text-3xl tracking-wide">
          {emoji} {label}
        </h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-muted underline underline-offset-4"
        >
          Start Over
        </button>
      </div>
      <p className="text-muted text-sm -mt-4 w-full max-w-md">{city}</p>

      {!venues && !error && <LoadingScreen emoji={emoji} city={city} />}

      {error && (
        <div className="flex flex-col items-center gap-4 min-h-[40vh] justify-center text-center">
          <p className="text-accent">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-2xl glass-card font-display text-xl tracking-wide px-8 py-3"
          >
            Try Again
          </button>
        </div>
      )}

      {venues && !error && <ResultsGrid venues={venues} />}
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingScreen emoji="🌙" city="" />}>
      <ResultsContent />
    </Suspense>
  );
}
