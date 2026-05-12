/**
 * Pure payload diff for the vendor's "admin edited my submission"
 * dashboard card. Compares the original payload against the admin's
 * full edited copy (admin_edits, which the edit endpoint stores as
 * the FULL post-edit payload, not a delta) and returns a per-field
 * record of { original, edited, changed }.
 *
 * Field whitelist is locked — not derived from Object.keys() — so
 * metadata fields the admin may set (timestamps, internal flags)
 * don't appear in the vendor-facing diff.
 *
 * No React imports; the renderer in components/dashboard/submission-
 * diff-view.tsx consumes the shape this returns.
 */

export const DIFF_FIELDS = [
  "name",
  "slug",
  "tagline",
  "description",
  "stages",
  "capabilities",
  "industries",
  "pricing",
] as const;

export type DiffField = (typeof DIFF_FIELDS)[number];

export type DiffValue = string | string[] | null | undefined;

export type DiffEntry = {
  original: DiffValue;
  edited: DiffValue;
  changed: boolean;
};

export type DiffResult = Record<DiffField, DiffEntry>;

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
 * Compute a per-field diff between the vendor's original payload
 * and the admin's edits. Both inputs are loosely typed because the
 * payload JSONB shape isn't strictly typed at the DB level (Phase
 * A.4 will tighten this when taxonomy curation lands).
 */
export function diffPayload(
  original: Record<string, unknown> | null | undefined,
  edits: Record<string, unknown> | null | undefined,
): DiffResult {
  const result: Partial<DiffResult> = {};
  for (const field of DIFF_FIELDS) {
    const ov = readField(original, field);
    const ev = readField(edits, field);
    result[field] = {
      original: ov,
      edited: ev,
      changed: !valuesEqual(ov, ev),
    };
  }
  return result as DiffResult;
}

function readField(
  source: Record<string, unknown> | null | undefined,
  field: DiffField,
): DiffValue {
  if (!source) return null;
  const v = source[field];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
    return v as string[];
  }
  return null;
}

/** True iff any field in the diff is changed. Used by the card
 *  component to decide whether to surface the "show all" toggle. */
export function hasAnyChange(diff: DiffResult): boolean {
  return DIFF_FIELDS.some((f) => diff[f].changed);
}

/** List the field keys that changed. Used for the
 *  "Show unchanged fields (N)" label. */
export function changedFieldKeys(diff: DiffResult): DiffField[] {
  return DIFF_FIELDS.filter((f) => diff[f].changed);
}

export function unchangedFieldKeys(diff: DiffResult): DiffField[] {
  return DIFF_FIELDS.filter((f) => !diff[f].changed);
}

/** Human-readable label for a field key. Used by the diff
 *  renderer; same labels show on both sides. */
export const DIFF_FIELD_LABELS: Record<DiffField, string> = {
  name: "Name",
  slug: "Slug",
  tagline: "Tagline",
  description: "Description",
  stages: "Stages",
  capabilities: "Capabilities",
  industries: "Industries",
  pricing: "Pricing",
};
