/**
 * Per-scope upload constraints. Single source of truth for the
 * client (pre-flight validation + UI hints) and the server
 * (/api/uploads route) so the rules can't drift.
 *
 * Constraints come from the Phase C plan:
 *   - logos      → 1 MB, PNG / JPG / WebP / SVG  (SVG is a mark format)
 *   - gallery    → 2 MB, PNG / JPG / WebP        (no SVG — gallery is
 *                                                 photos / screenshots)
 *
 * Free-tier Vercel Blob is 1 GB storage + 1 GB bandwidth / month
 * total — monitored via a Vercel spend alert at 800 MB (see
 * CLAUDE.md §14). Per-vendor count caps live at the wizard / DB
 * layer, not here — this file is per-file constraints.
 */

export type UploadScope = "vendor_logo" | "app_logo" | "app_gallery";

export type ScopeRules = {
  maxBytes: number;
  acceptedMimes: ReadonlySet<string>;
  acceptedExtensions: ReadonlyArray<string>;
};

const LOGO_RULES: ScopeRules = {
  maxBytes: 1 * 1024 * 1024,
  acceptedMimes: new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
  ]),
  acceptedExtensions: [".png", ".jpg", ".jpeg", ".webp", ".svg"],
};

const GALLERY_RULES: ScopeRules = {
  maxBytes: 2 * 1024 * 1024,
  acceptedMimes: new Set(["image/png", "image/jpeg", "image/webp"]),
  acceptedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
};

const RULES: Record<UploadScope, ScopeRules> = {
  vendor_logo: LOGO_RULES,
  app_logo: LOGO_RULES,
  app_gallery: GALLERY_RULES,
};

export function rulesFor(scope: UploadScope): ScopeRules {
  return RULES[scope];
}

export function isValidScope(s: string): s is UploadScope {
  return s === "vendor_logo" || s === "app_logo" || s === "app_gallery";
}

export type UploadValidationError =
  | { kind: "scope"; message: string }
  | { kind: "mime"; message: string }
  | { kind: "size"; message: string };

/**
 * Validate a candidate upload against the scope's rules. Returns
 * null on success; an error object with `kind` (so the API can
 * surface a `code` field) and a user-facing message on failure.
 */
export function validateUpload(
  scope: string,
  file: { type: string; size: number },
): UploadValidationError | null {
  if (!isValidScope(scope)) {
    return { kind: "scope", message: "Unknown upload scope" };
  }
  const rules = rulesFor(scope);
  if (!rules.acceptedMimes.has(file.type)) {
    const exts = rules.acceptedExtensions
      .map((e) => e.replace(/^\./, "").toUpperCase())
      .join(", ");
    return { kind: "mime", message: `Use ${exts}` };
  }
  if (file.size > rules.maxBytes) {
    const mb = (rules.maxBytes / 1024 / 1024).toFixed(0);
    return { kind: "size", message: `File must be ${mb} MB or smaller` };
  }
  return null;
}

/**
 * Map a MIME type to a filename extension. Used when constructing
 * Blob keys so the stored object has a recognisable suffix.
 */
export function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}
