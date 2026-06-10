"use client";

import { useState } from "react";
import Link from "next/link";

const VIBE_OPTIONS = [
  "Drinks & Bars",
  "Live Music",
  "Night Out",
  "Late Night Eats",
  "Rooftop Vibes",
  "Casual Fun",
  "Arts & Events",
  "Pride",
];

export default function SubmitPage() {
  const [form, setForm] = useState({
    venueName: "",
    type: "",
    neighborhood: "",
    city: "",
    dateTime: "",
    description: "",
    vibeTags: "",
    contactEmail: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleVibe(vibe: string) {
    setForm((f) => {
      const tags = f.vibeTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const has = tags.includes(vibe);
      const next = has ? tags.filter((t) => t !== vibe) : [...tags, vibe];
      return { ...f, vibeTags: next.join(", ") };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (
      !form.venueName.trim() ||
      !form.type.trim() ||
      !form.neighborhood.trim() ||
      !form.city.trim() ||
      !form.dateTime.trim() ||
      !form.description.trim() ||
      !form.contactEmail.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Something went wrong");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-6 text-center">
        <span className="text-6xl">🎉</span>
        <h1 className="font-display text-4xl tracking-wide">Thanks!</h1>
        <p className="text-muted max-w-sm">
          Your submission is in. We review new spots and events before they go live.
        </p>
        <Link
          href="/"
          className="rounded-2xl bg-accent text-white font-display text-xl tracking-wide px-8 py-3 transition-transform active:scale-95"
        >
          Back to Find Your Night
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-screen px-6 py-12 gap-6">
      <div className="flex items-center justify-between w-full max-w-md">
        <h1 className="font-display text-4xl tracking-wide">Submit an Event</h1>
        <Link href="/" className="text-sm text-muted underline underline-offset-4">
          Home
        </Link>
      </div>
      <p className="text-muted text-sm w-full max-w-md -mt-4">
        Tell us about your venue or event — we&apos;ll review it before it goes live.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-md">
        <input
          type="text"
          placeholder="Venue / Event Name *"
          value={form.venueName}
          onChange={(e) => update("venueName", e.target.value)}
          className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted"
          maxLength={120}
        />
        <input
          type="text"
          placeholder="Type (e.g. Bar, Festival, Pop-up) *"
          value={form.type}
          onChange={(e) => update("type", e.target.value)}
          className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted"
          maxLength={60}
        />
        <input
          type="text"
          placeholder="Neighborhood *"
          value={form.neighborhood}
          onChange={(e) => update("neighborhood", e.target.value)}
          className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted"
          maxLength={100}
        />
        <input
          type="text"
          placeholder="City *"
          value={form.city}
          onChange={(e) => update("city", e.target.value)}
          className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted"
          maxLength={100}
        />
        <input
          type="text"
          placeholder="Date & Time *"
          value={form.dateTime}
          onChange={(e) => update("dateTime", e.target.value)}
          className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted"
          maxLength={100}
        />
        <textarea
          placeholder="Description *"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted min-h-28 resize-none"
          maxLength={1000}
        />

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Vibe tags</p>
          <div className="flex flex-wrap gap-2">
            {VIBE_OPTIONS.map((vibe) => {
              const active = form.vibeTags
                .split(",")
                .map((t) => t.trim())
                .includes(vibe);
              return (
                <button
                  type="button"
                  key={vibe}
                  onClick={() => toggleVibe(vibe)}
                  className={`text-xs px-3 py-2 rounded-full border transition-colors ${
                    active
                      ? "bg-accent/20 border-accent text-accent"
                      : "bg-white/5 border-card-border text-muted"
                  }`}
                >
                  {vibe}
                </button>
              );
            })}
          </div>
        </div>

        <input
          type="email"
          placeholder="Contact Email *"
          value={form.contactEmail}
          onChange={(e) => update("contactEmail", e.target.value)}
          className="glass-card w-full px-5 py-4 outline-none focus:border-accent/60 placeholder:text-muted"
          maxLength={254}
        />

        {error && <p className="text-sm text-accent">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-accent text-white font-display text-2xl tracking-wide py-4 transition-transform active:scale-95 disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </main>
  );
}
