import "server-only";

/**
 * Per-instance, in-memory IP rate limiter.
 *
 * Vercel functions are short-lived but a single warm instance handles
 * many requests, so a Map-based limiter gives meaningful protection
 * against the obvious "submit-the-form-1000-times" attack without
 * pulling in Redis / Upstash.
 *
 * NOT a globally enforced limit. A determined attacker can hit
 * different function instances or different regions and bypass this.
 * For real distributed rate limiting we'd need a shared store —
 * deferred to Stage 7 if abuse becomes measurable.
 *
 * Window: 1 hour rolling; bucket: 5 requests per IP.
 */

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/** Returns true if the request is allowed; false if it should be 429'd. */
export function checkRateLimit(ip: string, now: number = Date.now()): boolean {
  // Cheap eviction — sweep on every call. Fine at low volumes; if the
  // map ever grows beyond a few thousand entries we'd want a periodic
  // sweep instead, but that's not the regime this limiter targets.
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  const existing = buckets.get(ip);
  if (!existing || existing.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (existing.count >= MAX_PER_WINDOW) return false;
  existing.count += 1;
  return true;
}

/** Test-only: clears every bucket so cases don't leak across tests. */
export function __resetRateLimitForTests(): void {
  buckets.clear();
}
