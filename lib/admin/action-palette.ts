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

/**
 * Human-readable labels for the 13 known action keys. Used by the
 * audit-log viewer's chip text + the analytics legend. Unknown keys
 * fall back to the raw action key.
 */
export const ACTION_LABEL: Record<string, string> = {
  "submission.approve": "Approved submission",
  "submission.edit": "Edited submission",
  "submission.reject": "Rejected submission",
  "submission.vendor_approve": "Vendor approved edits",
  "submission.vendor_request_changes": "Vendor requested changes",
  "submission.resubmit": "Vendor resubmitted",
  "vendor.suspend": "Suspended vendor",
  "vendor.unsuspend": "Reinstated vendor",
  "vendor.delete": "Deleted vendor",
  "app.flag": "Flagged product",
  "app.unflag": "Unflagged product",
  "clerk.metadata_sync_failed": "Clerk metadata sync failed",
  "vendor_member.gdpr_delete": "GDPR delete",
};

export function actionColor(action: string): string {
  return ACTION_PALETTE[action] ?? ACTION_FALLBACK_COLOR;
}

export function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}
