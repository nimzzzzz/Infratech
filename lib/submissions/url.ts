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

/**
 * Predicate: does this URL string have a real-looking hostname?
 *
 * Why: WHATWG URL parsing accepts hostnames with no dots ("rr",
 * "localhost", "intranet") because such hosts are legal in some
 * contexts (LAN, private DNS). For our vendor-supplied product /
 * company URLs they're never what the user meant — every real
 * public website has at least one dot and a TLD.
 *
 * Rule: the hostname must contain at least one dot AND end in a TLD
 * of 2 or more alphabetic characters. That matches every real TLD
 * (`.com`, `.io`, `.co.uk`, `.museum`, …) and rejects:
 *   - bare hostnames: "rr", "example", "localhost"
 *   - IP-only with trailing numerics: "192.168.1.1" → fails (TLD `1`)
 *   - punycode hostnames containing non-ASCII end-segments
 *
 * IPv6/IPv4 are intentionally rejected — no legitimate vendor URL
 * needs raw IPs.
 *
 * Returns false on URL parse failure (caller's `z.url()` should
 * already have caught this, but defence-in-depth).
 */
export function hasRealHostname(url: string): boolean {
  try {
    const u = new URL(url);
    return /\.[a-z]{2,}$/i.test(u.hostname);
  } catch {
    return false;
  }
}
