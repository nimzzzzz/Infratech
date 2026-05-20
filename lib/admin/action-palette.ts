/**
 * Shared visual vocabulary for audit_log `action` keys.
 *
 * Two surfaces consume this:
 *   - /admin/analytics — the admin-activity stacked bar chart.
 *   - /admin/audit-log — per-row action chips in the log viewer.
 *
 * Restrained palette: coral carries the dominant "approve" action;
 * darker coral marks "reject"; greys + near-black carry the
 * moderation verbs in proportion to their severity. `app.flag` and
 * `vendor.unsuspend` both use ink-3 — they almost never co-occur in
 * the same daily stack, and the legend's text labels disambiguate
 * when they do.
 *
 * Human-readable labels are kept here too so the chip text and the
 * legend stay in sync. The map covers the 13 known action keys (8
 * admin + 3 vendor + 2 system). Unknown keys fall back to ink-3 +
 * the raw key as the label.
 */

export const ACTION_PALETTE: Record<string, string> = {
  "submission.approve": "var(--color-coral)",
  "submission.reject": "var(--color-coral-deep)",
  "submission.edit": "var(--color-bloom-soft)",
  "app.flag": "var(--color-ink-3)",
  "app.unflag": "var(--color-line-strong)",
  "vendor.suspend": "var(--color-ink-2)",
  "vendor.unsuspend": "var(--color-ink-3)",
  "vendor.delete": "var(--color-ink)",
};

export const ACTION_FALLBACK_COLOR = "var(--color-ink-3)";

export function actionColor(action: string): string {
  return ACTION_PALETTE[action] ?? ACTION_FALLBACK_COLOR;
}

/**
 * Past-tense verb phrases used by the /admin/analytics Recent activity
 * row format `<ActorName> <verb> <target> — <timestamp>`. Submission
 * verbs include the word "submission" so the target reads cleanly
 * ("approved submission #165"); vendor/app verbs are bare so the
 * target carries the name ("suspended Arctus", "flagged DWAVE").
 *
 * Unknown actions fall back to the raw key, which preserves
 * grep-ability if a new action surfaces before the map catches up.
 */
export const ACTION_VERB: Record<string, string> = {
  "submission.approve": "approved submission",
  "submission.reject": "rejected submission",
  "submission.edit": "edited submission",
  "submission.vendor_approve": "approved (as vendor) submission",
  "submission.vendor_request_changes": "requested changes on submission",
  "submission.resubmit": "resubmitted submission",
  "vendor.suspend": "suspended",
  "vendor.unsuspend": "reinstated",
  "vendor.delete": "deleted",
  "app.flag": "flagged",
  "app.unflag": "unflagged",
  "vendor_member.gdpr_delete": "was GDPR-deleted",
  "clerk.metadata_sync_failed": "had a metadata sync failure",
};

export function actionVerb(action: string): string {
  return ACTION_VERB[action] ?? action;
}

/**
 * Selective chip color for consequential audit actions in the
 * /admin/analytics Recent activity feed. Two visual roles:
 *
 *   green → admin approval (scarce by design — one action only)
 *   red   → consequential negative actions (reject / suspend /
 *           delete / flag). United visually because a scanner needs
 *           to spot any of them on sight.
 *
 * Actions absent from this map render as plain prose with the
 * verb between actor and target. Notable absences:
 *   - submission.vendor_approve: NOT chipped green — vendor approval
 *     is workflow signal, not editorial accountability.
 *   - vendor.unsuspend / app.unflag: reversals; restore normal state,
 *     don't need visual weight.
 *   - submission.edit: structural change, not a verdict; plain prose.
 *
 * Hex values are literal, not design-system tokens — chips are
 * meant to read as loud overlays on the otherwise-quiet feed.
 */
export type ChipColor = "green" | "red";

export const ACTION_CHIP_COLOR: Record<string, ChipColor> = {
  "submission.approve": "green",
  "submission.reject": "red",
  "vendor.suspend": "red",
  "vendor.delete": "red",
  "app.flag": "red",
};

export const CHIP_BG: Record<ChipColor, string> = {
  green: "#639922",
  red: "#A32D2D",
};

/**
 * Short UPPERCASE label for the chip text. Distinct from the verb
 * phrase used in plain-prose rows — chips are nouns/states ("APPROVED"
 * vs the prose "approved submission"). One word each, no punctuation.
 */
export const ACTION_CHIP_LABEL: Record<string, string> = {
  "submission.approve": "APPROVED",
  "submission.reject": "REJECTED",
  "vendor.suspend": "SUSPENDED",
  "vendor.delete": "DELETED",
  "app.flag": "FLAGGED",
};

/** Does this action render with a colored chip + actor-dot-target,
 *  or as plain prose with actor + verb + target? */
export function isChippedAction(action: string): boolean {
  return action in ACTION_CHIP_COLOR;
}
