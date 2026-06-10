const requestLog = new Map<string, number[]>();

/**
 * In-memory sliding-window rate limiter, keyed per-route via the `bucket` prefix.
 * Resets on cold start — acceptable for MVP traffic on Vercel serverless.
 */
export function isRateLimited(bucket: string, ip: string, max: number, windowMs: number): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const timestamps = (requestLog.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= max) {
    requestLog.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  requestLog.set(key, timestamps);
  return false;
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
