import { stages } from "@/lib/data/stages";

/**
 * Single source of truth for the user-facing stage label format.
 *
 *   "general"       → "General"
 *   "feasibility"   → "1. Feasibility"
 *   "definition"    → "2. Definition"
 *   "delivery"      → "3. Delivery"
 *   "operations"    → "4. Operations"
 *   "post-delivery" → "5. Post-Delivery"
 *
 * Stage *slugs*, DB values, URL routes, and API payloads stay
 * unchanged. This helper is purely a rendering concern — every
 * surface that shows a stage chip / tag / option label imports
 * this so the numbering format lives in one place.
 *
 * Position comes from the array index in lib/data/stages.ts (which
 * mirrors the DB stages.position column, ordered General-first per
 * migration 0004). General is index 0 → rendered without a prefix;
 * subsequent stages take their index directly as the visible number,
 * so renaming a stage doesn't shift the numbering.
 *
 * Unknown slugs pass through verbatim — defensive, so a typo or
 * stale slug from a stored payload can't crash the render.
 */
const bySlug = new Map(
  stages.map((s, idx) => [s.slug, { name: s.name, position: idx }]),
);

export function formatStageLabel(slug: string): string {
  const s = bySlug.get(slug);
  if (!s) return slug;
  if (slug === "general") return s.name;
  return `${s.position}. ${s.name}`;
}
