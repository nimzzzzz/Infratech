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
/**
 * Parse a raw CLERK_ADMIN_EMAILS value into a trimmed, lowercased,
 * de-blanked list. The single source of truth for how the env var is
 * tokenised — both isAdminEmail (membership test) and getAdminEmails
 * (recipient list) build on this.
 */
function parseAdminList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * The full admin recipient list from CLERK_ADMIN_EMAILS — parsed,
 * trimmed, lowercased, blanks dropped. Empty array when the env var is
 * unset/empty. Used to BCC admins on submission-review notifications.
 */
export function getAdminEmails(): string[] {
  return parseAdminList(env.clerk().adminEmails);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const candidate = email.trim().toLowerCase();
  if (!candidate) return false;

  return parseAdminList(env.clerk().adminEmails).includes(candidate);
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
  if (!candidate) return false;
  return parseAdminList(rawList).includes(candidate);
}
