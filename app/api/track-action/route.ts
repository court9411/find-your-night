import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_REQUESTS_PER_WINDOW = 120;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TARGET_TYPES = new Set(["event", "venue"]);
const ACTION_TYPES = new Set([
  "viewed",
  "clicked",
  "saved",
  "shared",
  "directions_clicked",
  "hidden",
  "quick_back",
  "searched_similar",
]);

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited("track-action", ip, MAX_REQUESTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: {
    userId?: unknown;
    anonId?: unknown;
    targetType?: unknown;
    targetId?: unknown;
    actionType?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : null;
  const anonId = typeof body.anonId === "string" ? body.anonId : null;
  const targetType = typeof body.targetType === "string" ? body.targetType : "";
  const targetId = typeof body.targetId === "string" ? body.targetId : "";
  const actionType = typeof body.actionType === "string" ? body.actionType : "";

  if (!TARGET_TYPES.has(targetType) || !ACTION_TYPES.has(actionType) || !UUID_REGEX.test(targetId)) {
    return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
  }
  if (!userId && !anonId) {
    return NextResponse.json({ error: "userId or anonId is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.rpc("log_user_action", {
    p_user_id: userId,
    p_anon_id: anonId,
    p_target_type: targetType,
    p_target_id: targetId,
    p_action_type: actionType,
  });

  if (error) {
    console.error("log_user_action RPC error:", error);
    return NextResponse.json({ error: "Couldn't record action." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
