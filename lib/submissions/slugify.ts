/**
 * Slug generator for vendor + app rows created from submissions.
 *
 * Constraints driven by the schema:
 *   - apps.slug and vendors.slug are TEXT NOT NULL with UNIQUE indexes
 *   - SEO contract (CLAUDE.md §7) wants clean slug-based URLs
 *
 * Rules:
 *   - lowercase
 *   - ASCII only (strip diacritics, drop everything outside [a-z0-9])
 *   - collapse runs of non-alphanumeric into a single `-`
 *   - trim leading/trailing `-`
 *   - max 64 characters
 *
 * On collision the API route returns 409 — we do NOT auto-disambiguate
 * with a numeric suffix because vendors deserve to know their slug.
 */
const DIACRITICS = /[̀-ͯ]/g;
const NON_ALPHANUM_RUN = /[^a-z0-9]+/g;
const TRIM_DASHES = /^-+|-+$/g;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(NON_ALPHANUM_RUN, "-")
    .replace(TRIM_DASHES, "")
    .slice(0, 64);
}
