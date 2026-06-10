"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

const STATUS_FILTERS = ["pending", "approved", "rejected", "all"] as const;

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const router = useRouter();

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

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function updateStatus(id: string, status: "approved" | "rejected") {
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

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const filtered =
    submissions?.filter((s) => filter === "all" || s.status === filter) ?? [];

  return (
    <main className="flex flex-col items-center min-h-screen px-6 py-12 gap-6">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <h1 className="font-display text-4xl tracking-wide">Submissions</h1>
        <button onClick={handleLogout} className="text-sm text-muted underline underline-offset-4">
          Log Out
        </button>
      </div>

      <div className="flex gap-2 w-full max-w-2xl">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-2 rounded-full border transition-colors capitalize ${
              filter === s
                ? "bg-accent/20 border-accent text-accent"
                : "bg-white/5 border-card-border text-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      {!submissions && !error && <p className="text-muted">Loading...</p>}

      {submissions && filtered.length === 0 && (
        <p className="text-muted">No {filter !== "all" ? filter : ""} submissions.</p>
      )}

      <div className="flex flex-col gap-4 w-full max-w-2xl">
        {filtered.map((s) => (
          <div key={s.id} className="glass-card p-5 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl tracking-wide leading-tight">
                  {s.venue_name}
                </h3>
                <p className="text-sm text-muted">
                  {s.type} · {s.neighborhood}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full border capitalize shrink-0 ${
                  s.status === "approved"
                    ? "border-green-500/40 text-green-400"
                    : s.status === "rejected"
                    ? "border-red-500/40 text-red-400"
                    : "border-accent/40 text-accent"
                }`}
              >
                {s.status}
              </span>
            </div>
            <p className="text-sm font-semibold">{s.date_time}</p>
            <p className="text-sm leading-relaxed">{s.description}</p>
            {s.vibe_tags && (
              <div className="flex flex-wrap gap-2">
                {s.vibe_tags.split(",").map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full bg-white/5 border border-card-border text-muted"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted">
              {s.contact_email} · {new Date(s.created_at).toLocaleString()}
            </p>

            {s.status === "pending" && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => updateStatus(s.id, "approved")}
                  disabled={updatingId === s.id}
                  className="flex-1 rounded-xl bg-accent text-white font-display text-lg tracking-wide py-2 transition-transform active:scale-95 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  onClick={() => updateStatus(s.id, "rejected")}
                  disabled={updatingId === s.id}
                  className="flex-1 rounded-xl glass-card font-display text-lg tracking-wide py-2 transition-transform active:scale-95 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
