import "server-only";
import { env } from "@/lib/env";

/**
 * Email allowlist matcher for Phase A.1 admin auto-onboarding.
 *
 * Returns true iff `email` is non-empty AND its lowercased form
 * exactly matches one of the comma-separated entries in the
 * CLERK_ADMIN_EMAILS env var (also lowercased, also trimmed of
 * whitespace).
 *
 * Rules:
 *   - Case-insensitive (Gmail / Outlook normalise differently)
 *   - Exact match only — no wildcards, no domain matching.
 *     Phase A.1 keeps this conservative; broader patterns can come
 *     later once we have a real admin-management UI.
 *   - Trim whitespace in both the env value entries and the candidate
 *     email so " a@x.com , b@y.com " parses cleanly.
 *   - Empty env value → always false (allowlist defeated; admin
 *     promotion via manual UPDATE only).
 *
 * Pure: no DB hit, no Clerk call. Safe to call on hot paths.
 *
 * SECURITY: callers MUST only pass the user's *verified primary*
 * email. Unverified addresses on a Clerk account can be set to any
 * value and would otherwise trip the allowlist. The webhook handler
 * is responsible for selecting the primary address.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const candidate = email.trim().toLowerCase();
  if (!candidate) return false;

  const raw = env.clerk().adminEmails;
  if (!raw) return false;

  const allowed = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(candidate);
}

/**
 * Test-only variant — bypasses the lazy env.clerk() call which is
 * brittle to mock. Inject the raw env value directly.
 */
export function isAdminEmailWithList(
  email: string | null | undefined,
  rawList: string,
): boolean {
  if (!email) return false;
  const candidate = email.trim().toLowerCase();
  if (!candidate || !rawList) return false;
  const allowed = rawList
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(candidate);
}
