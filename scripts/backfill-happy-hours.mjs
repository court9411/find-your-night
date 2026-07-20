/**
 * Best-effort happy-hour backfill for check-in-able venues without one yet.
 * There is NO happy-hour API and social search isn't reachable, so this pulls
 * each venue's website (from Google Places) and has Claude extract a happy
 * hour from the page text.
 *
 * v2: homepage-only fetch found ~nothing — happy hour lives on subpages. This
 * now also follows on-site links whose text/URL mentions happy hour / specials
 * / drinks / menu, and probes a few common paths (/happy-hour, /specials,
 * /menu/happy-hour), then extracts from the combined text. Still partial by
 * nature: menu PDFs, images, and Instagram-only happy hours are unreadable.
 * Pair this with the web-search "roundup sweep" (higher yield) — this script
 * is the long-tail cleanup for venues that publish HH on their own site.
 *
 * DRY-RUN + PILOT by default (no writes, first 15). Flags:
 *   node scripts/backfill-happy-hours.mjs                        # pilot, dry
 *   node scripts/backfill-happy-hours.mjs --limit 300            # more, dry
 *   node scripts/backfill-happy-hours.mjs --limit 300 --apply    # write medium+ confidence
 *
 * Writes only medium/high confidence and never overwrites an existing
 * happy_hour — stale/wrong happy hour is worse than none for this app.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *           GOOGLE_MAPS_SERVER_KEY, ANTHROPIC_API_KEY
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : 15;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function websiteFor(placeId) {
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: { "X-Goog-Api-Key": GOOGLE_API_KEY, "X-Goog-FieldMask": "websiteUri" },
    });
    if (!res.ok) return null;
    return (await res.json()).websiteUri ?? null;
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0" } });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Rank on-site links by how likely they point at a happy-hour page.
function happyHourLinks(html, base) {
  const scored = [];
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    let abs;
    try { abs = new URL(m[1], base).href; } catch { continue; }
    if (!abs.startsWith("http")) continue;
    const s = abs.toLowerCase();
    let score = 0;
    if (/happy.?hour/.test(s)) score = 3;
    else if (/special/.test(s)) score = 2;
    else if (/drink|cocktail/.test(s)) score = 1.5;
    else if (/menu/.test(s)) score = 1;
    if (score) scored.push({ abs, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set();
  return scored.map((x) => x.abs).filter((u) => !seen.has(u) && seen.add(u)).slice(0, 3);
}

async function gatherText(site) {
  const home = await fetchHtml(site);
  if (!home) return null;
  const pages = [strip(home)];
  const links = happyHourLinks(home, site);
  // common paths in case they aren't linked from the homepage
  const origin = (() => { try { return new URL(site).origin; } catch { return null; } })();
  const probes = origin ? ["/happy-hour", "/happyhour", "/specials", "/menu/happy-hour"].map((p) => origin + p) : [];
  const targets = [...new Set([...links, ...probes])].slice(0, 4);
  for (const url of targets) {
    const html = await fetchHtml(url);
    if (html) pages.push(strip(html));
    await sleep(80);
  }
  return pages.join("\n\n").slice(0, 14000);
}

async function extractHappyHour(name, text) {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content:
          `From this text off ${name}'s website, extract their happy hour ONLY if explicitly stated. ` +
          `Reply with strict JSON: {"found":boolean,"happy_hour":string|null,"confidence":"high"|"medium"|"low"}. ` +
          `happy_hour is a short human string like "Mon–Fri 4–7pm, $5 wells" or null. ` +
          `Do NOT infer or guess — no explicit happy hour means found=false. Confidence low if vague.\n\n` +
          text,
      },
    ],
  });
  try {
    const raw = msg.content.find((b) => b.type === "text")?.text ?? "{}";
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { found: false, happy_hour: null, confidence: "low" };
  }
}

async function run() {
  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, place_id, happy_hour")
    .in("venue_category", ["nightlife", "entertainment"])
    .is("happy_hour", null)
    .like("place_id", "ChIJ%")
    .limit(LIMIT);

  console.log(`Trying ${venues.length} venues (${APPLY ? "APPLY" : "DRY RUN"})\n`);
  let found = 0, noSite = 0, noText = 0, none = 0, wrote = 0;

  for (const v of venues) {
    const site = await websiteFor(v.place_id);
    await sleep(120);
    if (!site) { console.log(`[no site ] ${v.name}`); noSite++; continue; }
    const text = await gatherText(site);
    if (!text || text.length < 200) { console.log(`[no text ] ${v.name}  (${site})`); noText++; continue; }
    const hh = await extractHappyHour(v.name, text);
    if (!hh.found || !hh.happy_hour) { console.log(`[none    ] ${v.name}`); none++; continue; }
    console.log(`[FOUND ${hh.confidence.padEnd(6)}] ${v.name}: ${hh.happy_hour}`);
    found++;
    if (APPLY && (hh.confidence === "high" || hh.confidence === "medium")) {
      const { error } = await supabase.from("venues").update({ happy_hour: hh.happy_hour }).eq("id", v.id);
      if (!error) wrote++;
    }
  }

  console.log(`\n--- ${venues.length} tried: ${found} found, ${none} no HH on site, ${noSite} no website, ${noText} unreadable ---`);
  if (APPLY) console.log(`Wrote ${wrote} (medium+ confidence).`);
  else if (found) console.log(`Dry run — re-run with --apply to write medium+ confidence matches.`);
}

run().catch((e) => { console.error(e); process.exit(1); });
