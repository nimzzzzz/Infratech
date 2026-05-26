/**
 * Pure payload diff used by:
 *   - the vendor's "admin edited my submission" dashboard card (the
 *     original use case — compares the vendor's payload against the
 *     admin's full edited copy)
 *   - the admin's product_edit / company_edit review page (compares
 *     the live current values against the vendor's proposed payload)
 *
 * Field whitelist is locked — not derived from Object.keys() — so
 * metadata fields (timestamps, internal flags) don't appear. The
 * diff is now parameterized: callers pass the relevant field set so
 * one helper covers all three consumers without drift.
 *
 * No React imports; the renderer in components/dashboard/submission-
 * diff-view.tsx consumes the shape this returns.
 */

/** Default field set — used by the original consumer
 *  (SubmissionEditedCard). Covers what the admin can edit on a NEW
 *  submission via /api/admin/submissions/[id]/edit. */
export const DIFF_FIELDS = [
  "name",
  "slug",
  "tagline",
  "description",
  "stages",
  "capabilities",
  "industries",
  "pricingModels",
] as const;

/** Fields a vendor can change via a product_edit submission. Slug is
 *  intentionally included even though it's locked at submit time — it
 *  renders as a reassuring "current value" row in the admin diff. */
export const PRODUCT_EDIT_DIFF_FIELDS = [
  "name",
  "slug",
  "url",
  "appleAppStoreUrl",
  "googlePlayUrl",
  "tagline",
  "description",
  "stages",
  "capabilities",
  "industries",
  "pricingModels",
] as const;

/** Fields a vendor can change via a company_edit submission. */
export const COMPANY_EDIT_DIFF_FIELDS = [
  "companyName",
  "companyWebsite",
  "companyFounded",
  "companyHeadquarters",
  "companyRegions",
  "companyDescription",
  "companyLogoUrl",
] as const;

export type DiffField = string;

export type DiffValue = string | string[] | null | undefined;

export type DiffEntry = {
  original: DiffValue;
  edited: DiffValue;
  changed: boolean;
};

export type DiffResult = Record<string, DiffEntry>;

/**
 * True iff two payload values represent the same content. Arrays
 * compare by element order + value (cheap JSON.stringify comparison
 * since the values are small and primitives). Strings compare with
 * ===; null / undefined treated as equivalent to an empty equivalent.
 */
function valuesEqual(a: DiffValue, b: DiffValue): boolean {
  // Normalise null/undefined.
  const an = a ?? "";
  const bn = b ?? "";
  if (Array.isArray(an) && Array.isArray(bn)) {
    return JSON.stringify(an) === JSON.stringify(bn);
  }
  if (Array.isArray(an) || Array.isArray(bn)) {
    // Type mismatch (one array, one scalar) — definitely changed.
    return false;
  }
  return an === bn;
}

/**
 * Compute a per-field diff between two payload-shaped objects. Both
 * inputs are loosely typed because the payload JSONB shape isn't
 * strictly typed at the DB level. The optional `fields` argument
 * lets callers diff over different field sets (product vs company).
 */
export function diffPayload(
  original: Record<string, unknown> | null | undefined,
  edits: Record<string, unknown> | null | undefined,
  fields: readonly string[] = DIFF_FIELDS,
): DiffResult {
  const result: DiffResult = {};
  for (const field of fields) {
    const ov = readField(original, field);
    const ev = readField(edits, field);
    result[field] = {
      original: ov,
      edited: ev,
      changed: !valuesEqual(ov, ev),
    };
  }
  return result;
}

function readField(
  source: Record<string, unknown> | null | undefined,
  field: string,
): DiffValue {
  if (!source) return null;
  const v = source[field];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
    return v as string[];
  }
  // Numeric values (founded year) flatten to string for display.
  if (typeof v === "number") return String(v);
  return null;
}

/** True iff any field in the diff is changed. Used by the card
 *  component to decide whether to surface the "show all" toggle. */
export function hasAnyChange(diff: DiffResult): boolean {
  return Object.keys(diff).some((f) => diff[f]?.changed);
}

/** List the field keys that changed. Used for the
 *  "Show unchanged fields (N)" label. */
export function changedFieldKeys(diff: DiffResult): string[] {
  return Object.keys(diff).filter((f) => diff[f]?.changed);
}

export function unchangedFieldKeys(diff: DiffResult): string[] {
  return Object.keys(diff).filter((f) => !diff[f]?.changed);
}

/** Human-readable labels for every field key any of the field sets
 *  may reference. Single map so diff renderers don't each carry
 *  their own. */
export const DIFF_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  slug: "Slug",
  url: "Website",
  appleAppStoreUrl: "Apple App Store URL",
  googlePlayUrl: "Google Play URL",
  tagline: "Tagline",
  description: "Description",
  stages: "Stages",
  capabilities: "Capabilities",
  industries: "Industries",
  pricingModels: "Pricing",
  companyName: "Company name",
  companyWebsite: "Company website",
  companyFounded: "Year founded",
  companyHeadquarters: "Headquarters",
  companyRegions: "Regions",
  companyDescription: "Company description",
  companyLogoUrl: "Company logo",
};
