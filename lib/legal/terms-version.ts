/**
 * Single source of truth for the version string of our public-
 * facing legal documents (Terms of Service, Vendor Terms, Privacy
 * Policy, Cookie Policy). Bumping this constant is what triggers
 * re-acceptance: vendors who already accepted an older version
 * will be re-prompted on next sign-in because the modal compares
 * their latest accepted version against this constant.
 *
 * The public legal pages render TERMS_LAST_UPDATED at the top so
 * visitors can see currency at a glance.
 *
 * Kept in lib/legal/ (not lib/env or constants) so a future
 * version-history file can sit alongside it.
 */
export const TERMS_VERSION = "2026-05-10";
export const TERMS_LAST_UPDATED = "2026-05-10";
