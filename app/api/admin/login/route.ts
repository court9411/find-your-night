import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSessionToken } from "@/lib/auth";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

const MAX_ATTEMPTS_PER_WINDOW = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited("admin-login", ip, MAX_ATTEMPTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  const expected = process.env.ADMIN_PASSWORD ?? "";

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE_NAME, await getAdminSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return response;
}
