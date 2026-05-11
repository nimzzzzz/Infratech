import "server-only";

/**
 * Per-instance, in-memory rate limiter keyed by vendor_member.id.
 *
 * Mirrors lib/email/rate-limit.ts (which is IP-keyed) but keys on the
 * authenticated vendor_member's database id. Used for endpoints where
 * we already know who the caller is and want to cap them per-account
 * rather than per-IP — IP-based caps would be either too loose
 * (corporate NAT) or too strict (shared office) for that case.
 *
 * Same caveat applies: this is best-effort per warm Vercel instance,
 * not a globally enforced limit. A shared store (Upstash) is deferred
 * to Stage 7.
 *
 * Window: 1 hour rolling; bucket: 5 requests per vendor_member.id.
 */

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<number, Bucket>();

/** Returns true if the request is allowed; false if it should be 429'd. */
export function checkVendorMemberRateLimit(
  vendorMemberId: number,
  now: number = Date.now(),
): boolean {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  const existing = buckets.get(vendorMemberId);
  if (!existing || existing.resetAt <= now) {
    buckets.set(vendorMemberId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (existing.count >= MAX_PER_WINDOW) return false;
  existing.count += 1;
  return true;
}

/** Test-only: clears every bucket so cases don't leak across tests. */
export function __resetVendorMemberRateLimitForTests(): void {
  buckets.clear();
}
