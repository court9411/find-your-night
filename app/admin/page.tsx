"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_CATEGORIES } from "@/lib/vibeCategories";

interface PendingEvent {
  id: string;
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
  display_order: number;
  featured: boolean;
  category: string | null;
  created_at: string;
}

interface Submission {
  id: string;
  venue_name: string;
  type: string;
  neighborhood: string;
  date_time: string;
  description: string;
  vibe_tags: string;
  contact_email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface PendingVenue {
  id: string;
  name: string;
  address: string | null;
  neighborhood: string | null;
  venue_category: string | null;
  vibe_tags: string[] | null;
  price_level: number | null;
  description: string | null;
  image_url: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

type TabType = "pending-events" | "submissions" | "pending-venues";
const STATUS_FILTERS = ["pending", "approved", "rejected", "all"] as const;

export default function AdminDashboard() {
  const [tab, setTab] = useState<TabType>("pending-events");
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[] | null>(null);
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [pendingVenues, setPendingVenues] = useState<PendingVenue[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [openedDateInputs, setOpenedDateInputs] = useState<Record<string, string>>({});
  const router = useRouter();

  async function loadPendingEvents() {
    try {
      const res = await fetch("/api/admin/pending-events");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load");
      setPendingEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  async function loadSubmissions() {
    try {
      const res = await fetch("/api/admin/submissions");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load");
      setSubmissions(data.submissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  async function loadPendingVenues() {
    try {
      const res = await fetch("/api/admin/pending-venues");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load");
      setPendingVenues(data.venues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    if (tab === "pending-events") {
      loadPendingEvents();
    } else if (tab === "submissions") {
      loadSubmissions();
    } else {
      loadPendingVenues();
    }
  }, [tab]);

  async function updateEventStatus(id: string, status: "approved" | "rejected") {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/pending-events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Failed to update");
      }
      setPendingEvents((prev) =>
        prev ? prev.map((e) => (e.id === id ? { ...e, status } : e)) : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateEventField(
    id: string,
    fields: Partial<Pick<PendingEvent, "featured" | "category" | "display_order" | "vibe_tags">>
  ) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/pending-events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...fields }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Failed to update");
      }
      setPendingEvents((prev) =>
        prev ? prev.map((e) => (e.id === id ? { ...e, ...fields } : e)) : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  async function moveEvent(id: string, direction: "up" | "down") {
    const list = filteredEvents;
    const idx = list.findIndex((e) => e.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return;

    const reordered = [...list];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    const updates = reordered
      .map((e, i) => ({ id: e.id, display_order: i }))
      .filter((e, i) => e.display_order !== list[i].display_order);

    setUpdatingId(id);
    try {
      await Promise.all(
        updates.map((u) =>
          fetch("/api/admin/pending-events", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(u),
          })
        )
      );
      const orderMap = new Map(updates.map((u) => [u.id, u.display_order]));
      setPendingEvents((prev) =>
        prev
          ? prev
              .map((e) => (orderMap.has(e.id) ? { ...e, display_order: orderMap.get(e.id)! } : e))
              .sort((a, b) => a.display_order - b.display_order)
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder");
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateSubmissionStatus(id: string, status: "approved" | "rejected") {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Failed to update");
      }
      setSubmissions((prev) =>
        prev ? prev.map((s) => (s.id === id ? { ...s, status } : s)) : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event permanently?")) return;
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/pending-events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Failed to delete");
      }
      setPendingEvents((prev) =>
        prev ? prev.filter((e) => e.id !== id) : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteSubmission(id: string) {
    if (!confirm("Delete this submission permanently?")) return;
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/submissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Failed to delete");
      }
      setSubmissions((prev) =>
        prev ? prev.filter((s) => s.id !== id) : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setUpdatingId(null);
    }
  }

  async function approveVenue(id: string) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/pending-venues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "approve", openedDate: openedDateInputs[id] || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Failed to approve");
      }
      setPendingVenues((prev) =>
        prev ? prev.map((v) => (v.id === id ? { ...v, status: "approved" } : v)) : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setUpdatingId(null);
    }
  }

  async function rejectVenue(id: string) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/pending-venues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "reject" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Failed to reject");
      }
      setPendingVenues((prev) =>
        prev ? prev.map((v) => (v.id === id ? { ...v, status: "rejected" } : v)) : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteVenue(id: string) {
    if (!confirm("Delete this venue submission permanently?")) return;
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/pending-venues", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Failed to delete");
      }
      setPendingVenues((prev) => (prev ? prev.filter((v) => v.id !== id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const filteredEvents =
    pendingEvents?.filter((e) => filter === "all" || e.status === filter) ?? [];

  const filteredSubmissions =
    submissions?.filter((s) => filter === "all" || s.status === filter) ?? [];

  const filteredVenues =
    pendingVenues?.filter((v) => filter === "all" || v.status === filter) ?? [];

  return (
    <main className="flex flex-col items-center min-h-screen px-4 md:px-6 py-8 md:py-12 gap-6">
      <div className="flex items-center justify-between w-full max-w-6xl">
        <h1 className="font-display text-3xl md:text-4xl tracking-wide">Admin</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-muted underline underline-offset-4 hover:text-white"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="glass-card w-full max-w-6xl px-5 py-3 border border-red-500/30 bg-red-900/10">
          <p className="text-red-300 text-sm">{error}</p>
          <button
            onClick={() => setError("")}
            className="text-xs text-red-400 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 w-full max-w-6xl border-b border-white/10">
        <button
          onClick={() => {
            setTab("pending-events");
            setFilter("pending");
          }}
          className={`px-4 py-3 font-display text-sm tracking-wide transition-colors ${
            tab === "pending-events"
              ? "text-accent border-b-2 border-accent"
              : "text-muted hover:text-white"
          }`}
        >
          Pending Events
        </button>
        <button
          onClick={() => {
            setTab("submissions");
            setFilter("pending");
          }}
          className={`px-4 py-3 font-display text-sm tracking-wide transition-colors ${
            tab === "submissions"
              ? "text-accent border-b-2 border-accent"
              : "text-muted hover:text-white"
          }`}
        >
          Submissions
        </button>
        <button
          onClick={() => {
            setTab("pending-venues");
            setFilter("pending");
          }}
          className={`px-4 py-3 font-display text-sm tracking-wide transition-colors ${
            tab === "pending-venues"
              ? "text-accent border-b-2 border-accent"
              : "text-muted hover:text-white"
          }`}
        >
          Pending Venues
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 w-full max-w-6xl">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm transition-all ${
              filter === f
                ? "bg-accent text-white"
                : "bg-white/5 border border-white/10 text-muted hover:border-accent/60"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* PENDING EVENTS TAB */}
      {tab === "pending-events" && (
        <div className="grid grid-cols-1 gap-4 w-full max-w-6xl">
          {!pendingEvents ? (
            <div className="text-center py-12">
              <p className="text-muted">Loading pending events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted">No {filter === "all" ? "pending" : filter} events.</p>
            </div>
          ) : (
            filteredEvents.map((event, idx) => (
              <div
                key={event.id}
                className={`glass-card px-4 md:px-6 py-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${
                  event.featured ? "border border-accent/40" : ""
                }`}
              >
                <div className="flex md:flex-col gap-1 shrink-0 order-first">
                  <button
                    onClick={() => moveEvent(event.id, "up")}
                    disabled={updatingId === event.id || idx === 0}
                    className="px-2 py-1 rounded bg-white/5 border border-white/10 text-muted text-xs hover:border-white/30 disabled:opacity-30 transition-all"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveEvent(event.id, "down")}
                    disabled={updatingId === event.id || idx === filteredEvents.length - 1}
                    className="px-2 py-1 rounded bg-white/5 border border-white/10 text-muted text-xs hover:border-white/30 disabled:opacity-30 transition-all"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-2">
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.event_name}
                        className="w-16 h-16 object-cover rounded hidden md:block"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-lg tracking-wide truncate">
                        {event.event_name}
                      </h3>
                      <p className="text-sm text-muted">
                        {event.venue_name} • {event.date} at {event.start_time}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {event.address}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        {event.vibe_tags.map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs"
                          >
                            {tag}
                            <button
                              onClick={() =>
                                updateEventField(event.id, {
                                  vibe_tags: event.vibe_tags.filter((t) => t !== tag),
                                })
                              }
                              disabled={updatingId === event.id}
                              aria-label={`Remove ${tag} tag`}
                              className="text-muted hover:text-white disabled:opacity-50"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={tagInputs[event.id] ?? ""}
                          onChange={(e) =>
                            setTagInputs((prev) => ({ ...prev, [event.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            const newTag = (tagInputs[event.id] ?? "").trim();
                            if (!newTag || event.vibe_tags.includes(newTag)) return;
                            updateEventField(event.id, {
                              vibe_tags: [...event.vibe_tags, newTag],
                            });
                            setTagInputs((prev) => ({ ...prev, [event.id]: "" }));
                          }}
                          disabled={updatingId === event.id}
                          placeholder="Add tag…"
                          className="px-2 py-1 w-24 bg-white/5 border border-white/10 rounded text-xs text-white placeholder:text-muted outline-none focus:border-accent/60 disabled:opacity-50"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <label className="flex items-center gap-1.5 text-xs text-muted">
                          Category
                          <select
                            value={event.category ?? ""}
                            onChange={(e) =>
                              updateEventField(event.id, { category: e.target.value || null })
                            }
                            disabled={updatingId === event.id}
                            className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white disabled:opacity-50"
                          >
                            <option value="">No category</option>
                            {EVENT_CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={event.featured}
                            onChange={(e) =>
                              updateEventField(event.id, { featured: e.target.checked })
                            }
                            disabled={updatingId === event.id}
                          />
                          Feature This
                        </label>
                      </div>
                      <p className="text-xs text-muted mt-2">
                        Submitted: {event.submitter_email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={() => updateEventStatus(event.id, "approved")}
                    disabled={updatingId === event.id}
                    className="flex-1 md:flex-initial px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm font-medium hover:bg-green-500/30 disabled:opacity-50 transition-all"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => updateEventStatus(event.id, "rejected")}
                    disabled={updatingId === event.id}
                    className="flex-1 md:flex-initial px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 transition-all"
                  >
                    ✕ Reject
                  </button>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    disabled={updatingId === event.id}
                    className="flex-1 md:flex-initial px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-muted text-sm font-medium hover:border-white/30 disabled:opacity-50 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUBMISSIONS TAB */}
      {tab === "submissions" && (
        <div className="grid grid-cols-1 gap-4 w-full max-w-6xl">
          {!submissions ? (
            <div className="text-center py-12">
              <p className="text-muted">Loading submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted">No {filter === "all" ? "submissions" : filter} found.</p>
            </div>
          ) : (
            filteredSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="glass-card px-4 md:px-6 py-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg tracking-wide truncate">
                    {submission.venue_name}
                  </h3>
                  <p className="text-sm text-muted">
                    {submission.type} • {submission.neighborhood}
                  </p>
                  <p className="text-xs text-muted">{submission.date_time}</p>
                  <p className="text-xs text-muted mt-1 line-clamp-2">
                    {submission.description}
                  </p>
                  <p className="text-xs text-muted mt-2">
                    Contact: {submission.contact_email}
                  </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={() => updateSubmissionStatus(submission.id, "approved")}
                    disabled={updatingId === submission.id}
                    className="flex-1 md:flex-initial px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm font-medium hover:bg-green-500/30 disabled:opacity-50 transition-all"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => updateSubmissionStatus(submission.id, "rejected")}
                    disabled={updatingId === submission.id}
                    className="flex-1 md:flex-initial px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 transition-all"
                  >
                    ✕ Reject
                  </button>
                  <button
                    onClick={() => deleteSubmission(submission.id)}
                    disabled={updatingId === submission.id}
                    className="flex-1 md:flex-initial px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-muted text-sm font-medium hover:border-white/30 disabled:opacity-50 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PENDING VENUES TAB */}
      {tab === "pending-venues" && (
        <div className="grid grid-cols-1 gap-4 w-full max-w-6xl">
          {!pendingVenues ? (
            <div className="text-center py-12">
              <p className="text-muted">Loading pending venues...</p>
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted">No {filter === "all" ? "pending" : filter} venues.</p>
            </div>
          ) : (
            filteredVenues.map((venue) => (
              <div
                key={venue.id}
                className="glass-card px-4 md:px-6 py-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-2">
                    {venue.image_url && (
                      <img
                        src={venue.image_url}
                        alt={venue.name}
                        className="w-16 h-16 object-cover rounded hidden md:block"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-lg tracking-wide truncate">{venue.name}</h3>
                      <p className="text-sm text-muted">
                        {venue.venue_category ?? "No category"}
                        {venue.neighborhood ? ` • ${venue.neighborhood}` : ""}
                        {venue.price_level ? ` • ${"$".repeat(venue.price_level)}` : ""}
                      </p>
                      {venue.address && <p className="text-xs text-muted mt-1">{venue.address}</p>}
                      {venue.description && (
                        <p className="text-xs text-muted mt-1 line-clamp-2">{venue.description}</p>
                      )}
                      {venue.vibe_tags && venue.vibe_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {venue.vibe_tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <label className="flex items-center gap-1.5 text-xs text-muted mt-2 w-fit">
                        Opened
                        <input
                          type="date"
                          value={openedDateInputs[venue.id] ?? ""}
                          onChange={(e) =>
                            setOpenedDateInputs((prev) => ({ ...prev, [venue.id]: e.target.value }))
                          }
                          disabled={updatingId === venue.id || venue.status !== "pending"}
                          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white [color-scheme:dark] disabled:opacity-50"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={() => approveVenue(venue.id)}
                    disabled={updatingId === venue.id || venue.status !== "pending"}
                    className="flex-1 md:flex-initial px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm font-medium hover:bg-green-500/30 disabled:opacity-50 transition-all"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => rejectVenue(venue.id)}
                    disabled={updatingId === venue.id || venue.status !== "pending"}
                    className="flex-1 md:flex-initial px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 transition-all"
                  >
                    ✕ Reject
                  </button>
                  <button
                    onClick={() => deleteVenue(venue.id)}
                    disabled={updatingId === venue.id}
                    className="flex-1 md:flex-initial px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-muted text-sm font-medium hover:border-white/30 disabled:opacity-50 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
