/**
 * URL normalisation for vendor-supplied input.
 *
 * Vendors type things like "example.com", "www.example.com", or
 * "https://example.com" interchangeably. We accept all three and
 * normalise to a fully-qualified https URL before persisting.
 *
 * Strategy:
 *   - Trim whitespace
 *   - If no scheme, prepend "https://"
 *   - Return the candidate as-is; the caller pipes through
 *     `z.string().url()` for the actual structural validation.
 *
 * Truly malformed input ("asdf", "not a url", strings without dots)
 * fails downstream at the `z.string().url()` check, producing a Zod
 * error the step UI can render under the field.
 *
 * Edge cases handled:
 *   - Empty string → empty string (caller decides whether empty is
 *     allowed via `.min(1)` or `.optional()`)
 *   - Already has scheme → returned unchanged (case-preserving check)
 *   - Leading/trailing whitespace → stripped
 */
export function normaliseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
