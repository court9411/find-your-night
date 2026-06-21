/**
 * FYN Ticketmaster Ingestion Script
 * Run: node scripts/ingest-ticketmaster.mjs
 *
 * Pulls upcoming arts & music events in Cincinnati from Ticketmaster
 * and upserts them into pending_events (auto-approved, source = 'ticketmaster').
 *
 * Add to .env.local:
 *   TICKETMASTER_API_KEY=your-key-here
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ── Clients ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Config ───────────────────────────────────────────────────────────────────

const TM_API_KEY = process.env.TICKETMASTER_API_KEY;
const TM_BASE = "https://app.ticketmaster.com/discovery/v2";

// Ticketmaster segment IDs to pull
// Music = KZFzniwnSyZfZ7v7nJ, Arts & Theatre = KZFzniwnSyZfZ7v7na
const SEGMENTS = [
  { id: "KZFzniwnSyZfZ7v7nJ", name: "Music" },
  { id: "KZFzniwnSyZfZ7v7na", name: "Arts & Theatre" },
];

const VIBE_TAXONOMY = [
  "date-night",
  "low-key",
  "hype",
  "live-music",
  "dancing",
  "rooftop",
  "day-drink",
  "after-work",
  "lgbtq-friendly",
  "sports",
  "cocktails",
  "dive-bar",
  "outdoor",
  "arts-culture",
  "family-friendly",
];

// ── Ticketmaster Fetch ────────────────────────────────────────────────────────

async function fetchEventsPage(segmentId, page = 0) {
  const now = new Date().toISOString().split(".")[0] + "Z";

  const params = new URLSearchParams({
    apikey: TM_API_KEY,
    segmentId,
    city: "Cincinnati",
    stateCode: "OH",
    countryCode: "US",
    size: "200",
    page: String(page),
    startDateTime: now,
    sort: "date,asc",
  });

  const res = await fetch(`${TM_BASE}/events.json?${params}`);
  const data = await res.json();

  if (data.fault) {
    throw new Error(`Ticketmaster API error: ${data.fault.faultstring}`);
  }

  return data;
}

async function fetchAllEvents() {
  const allEvents = new Map();

  for (const segment of SEGMENTS) {
    console.log(`\nFetching ${segment.name} events...`);

    let page = 0;
    let totalPages = 1;

    do {
      const data = await fetchEventsPage(segment.id, page);
      const events = data._embedded?.events || [];
      const pageInfo = data.page || {};

      totalPages = pageInfo.totalPages || 1;

      for (const event of events) {
        if (!allEvents.has(event.id)) {
          allEvents.set(event.id, event);
        }
      }

      console.log(
        `  Page ${page + 1}/${totalPages}: ${events.length} events (total unique: ${allEvents.size})`
      );

      page++;
      await sleep(300);
    } while (page < totalPages && page < 5);
  }

  return Array.from(allEvents.values());
}

// ── Transform Ticketmaster → pending_events format ───────────────────────────

function transformEvent(tmEvent) {
  const venue = tmEvent._embedded?.venues?.[0];
  const image =
    tmEvent.images?.find((img) => img.ratio === "16_9" && img.width > 500) ||
    tmEvent.images?.[0];
  const priceRange = tmEvent.priceRanges?.[0];
  const classification = tmEvent.classifications?.[0];
  const startDate = tmEvent.dates?.start;

  let priceLabel = null;
  if (priceRange) {
    const min = Math.round(priceRange.min);
    const max = Math.round(priceRange.max);
    priceLabel = min === max ? `$${min}` : `$${min}–$${max}`;
  }

  const genre = [
    classification?.segment?.name,
    classification?.genre?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    event_name: tmEvent.name,
    venue_name: venue?.name || "TBD",
    address: venue?.address?.line1 || null,
    city: venue?.city?.name || "Cincinnati",
    state: venue?.state?.stateCode || "OH",
    date: startDate?.localDate || null,
    start_time: startDate?.localTime || "00:00:00",
    image_url: image?.url || null,
    ticket_link: tmEvent.url || null,
    price: priceLabel,
    description: genre || null,
    submitter_email: "ticketmaster@findyournight.app",
    status: "approved",
    source: "ticketmaster",
    external_id: tmEvent.id,
  };
}

// ── Claude Haiku Vibe Classification ─────────────────────────────────────────

async function classifyVibes(event) {
  const prompt = `You are tagging events for a Cincinnati nightlife and entertainment app.

Event: ${event.event_name}
Venue: ${event.venue_name}
Type: ${event.description || "unknown"}
Price: ${event.price || "unknown"}

From the list below, return ONLY the tags that clearly apply.
Tags: ${VIBE_TAXONOMY.join(", ")}

Return ONLY a JSON array, nothing else. Example: ["live-music", "date-night"]`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].text
      .trim()
      .replace(/^```json\n?/, "")
      .replace(/\n?```$/, "");
    const parsed = JSON.parse(raw);
    return parsed.filter((tag) => VIBE_TAXONOMY.includes(tag));
  } catch {
    return [];
  }
}

// ── Supabase Upsert ───────────────────────────────────────────────────────────

async function upsertEvent(event, vibeTags) {
  const { error } = await supabase.from("pending_events").upsert(
    { ...event, vibe_tags: vibeTags },
    { onConflict: "external_id" }
  );

  if (error) {
    console.error(`  ✗ Supabase error for "${event.event_name}": ${error.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎵 FYN Ticketmaster Ingestion Starting...\n");

  if (!TM_API_KEY) {
    console.error("❌ TICKETMASTER_API_KEY is missing from .env.local");
    process.exit(1);
  }

  const tmEvents = await fetchAllEvents();
  console.log(`\n✅ Total unique events found: ${tmEvents.length}`);
  console.log("─".repeat(50));

  console.log("\nClassifying + saving to Supabase...\n");

  let saved = 0;

  for (let i = 0; i < tmEvents.length; i++) {
    const tmEvent = tmEvents[i];
    const event = transformEvent(tmEvent);

    process.stdout.write(`[${i + 1}/${tmEvents.length}] ${event.event_name}... `);

    const vibeTags = await classifyVibes(event);
    await upsertEvent(event, vibeTags);

    console.log(`✓ [${vibeTags.join(", ") || "no tags"}]`);
    saved++;

    await sleep(150);
  }

  console.log("\n" + "─".repeat(50));
  console.log(`\n🎉 Done! ${saved} events saved to Supabase.`);
  console.log(`Estimated Claude cost: ~$${(tmEvents.length * 0.001).toFixed(2)}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
