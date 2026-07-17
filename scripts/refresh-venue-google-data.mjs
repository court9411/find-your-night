/**
 * Resolves real Google Place IDs + accurate coordinates for venues that are
 * missing them — the venues with synthetic place_ids ("curated-<slug>",
 * "manual_<slug>") that were never matched to a real Google listing, plus any
 * venue with NULL lat/lng. Once a venue has a real "ChIJ..." id, the existing
 * scripts/backfill-venue-photos.mjs picks it up for photos on its next run
 * (that script deliberately skips synthetic ids), so this script does NOT
 * fetch photos itself — run the photo backfill after applying this.
 *
 * DRY-RUN BY DEFAULT — prints proposed changes and writes nothing. Pass
 * --apply to actually update rows. Matches are guarded so a bad Places result
 * can't silently overwrite a good row (see verdicts below); anything not GOOD
 * is reported for human review and skipped even under --apply.
 *
 *   node scripts/refresh-venue-google-data.mjs            # dry run (safe)
 *   node scripts/refresh-venue-google-data.mjs --apply    # write GOOD matches
 *   node scripts/refresh-venue-google-data.mjs --all      # also re-verify venues that already have real ids
 *
 * Requires (already in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_MAPS_SERVER_KEY
 *
 * NOTE: this writes to the venues table, which the DB-focused workflow owns.
 * Coordinate before --apply'ing against production.
 *
 * FK GOTCHA: venues.place_id is a foreign-key TARGET — user_venue_interactions
 * (saves/likes) reference venues by place_id, not by the uuid. So changing a
 * venue's place_id fails if any saved interaction points at the old id
 * (venue_photos/checkins/visits are safe — they key on the uuid). This script
 * pre-checks for those interactions and SKIPS the write with a clear message
 * rather than throwing. The real fix for those is DB-side: make the FK
 * ON UPDATE CASCADE (then re-run this), or update both tables in one txn.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const ALL = process.argv.includes("--all");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role bypasses RLS
);
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

const REQUEST_DELAY_MS = 150; // stay well under Places QPS limits
// Greater Cincinnati / NKY bounding box — a matched place outside this is
// almost certainly the wrong "Rosedale"/"The Greenwich" in another city.
const BOX = { latMin: 38.7, latMax: 39.5, lngMin: -85.0, lngMax: -84.0 };
const CINCY_CENTER = { lat: 39.1031, lng: -84.512 };
// If a venue already has coords and the match lands more than this far away,
// treat it as suspicious (probably a different place) and flag for review
// rather than overwrite.
const MAX_DRIFT_METERS = 500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function haversine(a, b) {
  const R = 6371000;
  const tr = (x) => (x * Math.PI) / 180;
  const dLat = tr(b.lat - a.lat);
  const dLng = tr(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(tr(a.lat)) * Math.cos(tr(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}

const inBox = (lat, lng) =>
  lat > BOX.latMin && lat < BOX.latMax && lng > BOX.lngMin && lng < BOX.lngMax;

// Loose name-overlap signal: share of the venue's significant name tokens that
// appear in the matched place's name. Not a hard gate on its own, just part of
// the verdict.
function nameOverlap(a, b) {
  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !["the", "and", "bar", "grill"].includes(t));
  const at = norm(a);
  const bt = new Set(norm(b));
  if (!at.length) return 0;
  return at.filter((t) => bt.has(t)).length / at.length;
}

const isSyntheticId = (pid) => !pid || /^(curated-|manual_)/.test(pid);
const isRealId = (pid) => /^ChIJ/.test(pid || "");

// ── Google Places (New) ────────────────────────────────────────────────────

async function placeDetails(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "id,location,displayName,formattedAddress",
    },
  });
  if (!res.ok) throw new Error(`Details ${res.status}: ${await res.text()}`);
  return res.json();
}

async function textSearch(query) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.location,places.displayName,places.formattedAddress",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: { center: { latitude: CINCY_CENTER.lat, longitude: CINCY_CENTER.lng }, radius: 40000 },
      },
      maxResultCount: 3,
    }),
  });
  if (!res.ok) throw new Error(`TextSearch ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.places?.[0] ?? null;
}

// ── Resolve one venue → { newPlaceId, lat, lng, matchedName, matchedAddr, verdict, note } ──

async function resolve(v) {
  // Case A: already has a real Google id — trust Place Details for coords
  // (no matching risk). Only useful for filling NULL coords or, under --all,
  // re-verifying drift.
  if (isRealId(v.place_id)) {
    if (!ALL && v.lat != null && v.lng != null) {
      return { verdict: "SKIP", note: "already has real id + coords" };
    }
    const d = await placeDetails(v.place_id);
    const loc = d.location;
    if (!loc) return { verdict: "REVIEW", note: "details returned no location" };
    if (!inBox(loc.latitude, loc.longitude))
      return { verdict: "REVIEW", note: "details location outside Cincinnati box" };
    const drift =
      v.lat != null ? haversine({ lat: v.lat, lng: v.lng }, { lat: loc.latitude, lng: loc.longitude }) : null;
    return {
      newPlaceId: v.place_id,
      lat: loc.latitude,
      lng: loc.longitude,
      matchedName: d.displayName?.text,
      matchedAddr: d.formattedAddress,
      drift,
      verdict: drift != null && drift > MAX_DRIFT_METERS ? "REVIEW" : "GOOD",
      note: drift != null ? `${drift}m from stored` : "filled NULL coords",
    };
  }

  // Case B: synthetic id — search by the best query we have and verify hard.
  const query = v.address && /\d/.test(v.address)
    ? `${v.name}, ${v.address}` // has a street number — strongest signal
    : `${v.name}, ${v.neighborhood || ""} Cincinnati OH`.replace(/\s+/g, " ");
  const p = await textSearch(query);
  if (!p) return { verdict: "REVIEW", note: `no Places result for "${query}"` };

  const loc = p.location;
  const outBox = !inBox(loc.latitude, loc.longitude);
  const overlap = nameOverlap(v.name, p.displayName?.text);
  const drift =
    v.lat != null ? haversine({ lat: v.lat, lng: v.lng }, { lat: loc.latitude, lng: loc.longitude }) : null;

  let verdict = "GOOD";
  const reasons = [];
  if (outBox) { verdict = "REVIEW"; reasons.push("outside Cincinnati box"); }
  if (overlap < 0.5) { verdict = "REVIEW"; reasons.push(`weak name match (${Math.round(overlap * 100)}%)`); }
  if (drift != null && drift > MAX_DRIFT_METERS) { verdict = "REVIEW"; reasons.push(`${drift}m from stored`); }

  return {
    newPlaceId: p.id,
    lat: loc.latitude,
    lng: loc.longitude,
    matchedName: p.displayName?.text,
    matchedAddr: p.formattedAddress,
    drift,
    verdict,
    note: reasons.length ? reasons.join("; ") : `name match ${Math.round(overlap * 100)}%`,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function run() {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_MAPS_SERVER_KEY missing from .env.local");

  const { data: venues, error } = await supabase
    .from("venues")
    .select("id, name, lat, lng, address, place_id, source, venue_category");
  if (error) throw error;

  // Default target: needs a real id, or has no coords. --all re-verifies
  // everything with a real id too (heavier, more Places cost).
  const targets = venues.filter((v) =>
    ALL ? true : isSyntheticId(v.place_id) || v.lat == null || v.lng == null
  );

  console.log(
    `${venues.length} venues total; ${targets.length} to ${ALL ? "re-verify" : "resolve"} ` +
      `(mode: ${APPLY ? "APPLY — will write GOOD matches" : "DRY RUN — no writes"})\n`
  );

  const buckets = { GOOD: [], REVIEW: [], SKIP: [] };

  for (const v of targets) {
    let r;
    try {
      r = await resolve(v);
    } catch (err) {
      r = { verdict: "REVIEW", note: `error: ${err.message}` };
    }
    await sleep(REQUEST_DELAY_MS);

    (buckets[r.verdict] || buckets.REVIEW).push({ v, r });
    if (r.verdict === "SKIP") continue;

    const idChange = r.newPlaceId && r.newPlaceId !== v.place_id ? `${v.place_id} → ${r.newPlaceId}` : "(id unchanged)";
    console.log(
      `[${r.verdict}] ${v.name} (${v.venue_category})\n` +
        `        id:    ${idChange}\n` +
        `        coord: ${v.lat},${v.lng} → ${r.lat},${r.lng}\n` +
        `        match: "${r.matchedName}" @ ${r.matchedAddr}\n` +
        `        note:  ${r.note}`
    );

    if (APPLY && r.verdict === "GOOD") {
      const idChanged = r.newPlaceId && r.newPlaceId !== v.place_id;
      if (idChanged) {
        // place_id is an FK target — refuse the write if saved interactions
        // reference the old id, rather than letting the constraint throw.
        const { count } = await supabase
          .from("user_venue_interactions")
          .select("id", { count: "exact", head: true })
          .eq("place_id", v.place_id);
        if (count && count > 0) {
          console.log(
            `        ⤼ SKIPPED: ${count} saved interaction(s) reference the old place_id — ` +
              `needs ON UPDATE CASCADE or a transactional update (DB-owned).`
          );
          buckets.REVIEW.push({ v, r: { ...r, note: `${count} saved interaction(s) block place_id change` } });
          continue;
        }
      }
      const { error: upErr } = await supabase
        .from("venues")
        .update({ place_id: r.newPlaceId, lat: r.lat, lng: r.lng })
        .eq("id", v.id);
      console.log(upErr ? `        !! WRITE FAILED: ${upErr.message}` : `        ✔ written`);
    }
  }

  console.log(
    `\nSummary: ${buckets.GOOD.length} GOOD, ${buckets.REVIEW.length} REVIEW (skipped), ${buckets.SKIP.length} unchanged.`
  );
  if (buckets.REVIEW.length) {
    console.log("\nNeeds human review (NOT written):");
    for (const { v, r } of buckets.REVIEW) console.log(`  - ${v.name}: ${r.note}`);
  }
  if (!APPLY && buckets.GOOD.length) {
    console.log(`\nRe-run with --apply to write the ${buckets.GOOD.length} GOOD matches, then run backfill-venue-photos.mjs for photos.`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
