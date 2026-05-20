import "server-only";

/**
 * Per-action human-prose formatter for audit_log before/after
 * payloads. Returns a single labeled expander block (or null when
 * the row has nothing meaningful to expand on — pure boolean flips,
 * unchanged edits, GDPR-redacted rows).
 *
 * Each formatter is written against the EXACT shape its writer
 * produces (see route handlers under app/api/admin and app/api/
 * submissions). When in doubt, grep the writer rather than guessing
 * — the audit row's JSON is the only contract.
 *
 * No raw JSON output here by design. The viewer renders prose.
 */

export type ExpanderContent = { label: string; body: string };

export function formatAuditPayload(
  action: string,
  before: unknown,
  after: unknown,
): ExpanderContent | null {
  switch (action) {
    case "submission.reject": {
      const reason = (after as { rejectionReason?: unknown } | null)
        ?.rejectionReason;
      if (typeof reason === "string" && reason.trim().length > 0) {
        return { label: "Reason", body: reason };
      }
      return null;
    }

    case "submission.edit": {
      // Writer: before = { status, payload }, after = { status, adminEdits }.
      // Diff the field names between the two payload objects.
      const beforePayload = (before as { payload?: unknown } | null)?.payload;
      const afterEdits = (after as { adminEdits?: unknown } | null)?.adminEdits;
      const changed = diffKeys(beforePayload, afterEdits);
      if (changed.length === 0) return null;
      return {
        label: "Changes",
        body: `Changed: ${changed.join(", ")}`,
      };
    }

    case "submission.vendor_request_changes": {
      const feedback = (after as { vendorFeedback?: unknown } | null)
        ?.vendorFeedback;
      if (typeof feedback === "string" && feedback.trim().length > 0) {
        return { label: "Vendor feedback", body: feedback };
      }
      return null;
    }

    case "vendor.suspend":
    case "app.flag": {
      // Writers set after.reason to a string OR null. Trivial-flip
      // (reason null) → no expander.
      const reason = (after as { reason?: unknown } | null)?.reason;
      if (typeof reason === "string" && reason.trim().length > 0) {
        return { label: "Reason", body: reason };
      }
      return null;
    }

    case "vendor.delete": {
      // Writer's before payload includes productCount, submissionCount,
      // and optional reason. Other fields (memberEmails, full vendor
      // row) are present but intentionally NOT surfaced here.
      const b = before as
        | {
            productCount?: unknown;
            submissionCount?: unknown;
            reason?: unknown;
          }
        | null;
      const productCount =
        typeof b?.productCount === "number" ? b.productCount : 0;
      const submissionCount =
        typeof b?.submissionCount === "number" ? b.submissionCount : 0;
      const parts: string[] = [
        `${productCount} ${productCount === 1 ? "product" : "products"}`,
        `${submissionCount} ${
          submissionCount === 1 ? "submission" : "submissions"
        }`,
      ];
      let body = parts.join(", ");
      const reason = b?.reason;
      if (typeof reason === "string" && reason.trim().length > 0) {
        body += ` · Reason: ${reason}`;
      }
      return { label: "Deleted record", body };
    }

    case "clerk.metadata_sync_failed": {
      const error = (after as { error?: unknown } | null)?.error;
      if (typeof error === "string" && error.trim().length > 0) {
        return { label: "Error", body: error };
      }
      return null;
    }

    default:
      // No expander for: submission.approve, submission.vendor_approve,
      // submission.resubmit (verbs convey everything); vendor.unsuspend,
      // app.unflag (writers never include reason — pure boolean flips);
      // vendor_member.gdpr_delete (payload redacted at query layer +
      // belt-and-braces here).
      return null;
  }
}

/**
 * Shallow field-name diff between two object payloads. Returns the
 * sorted list of keys whose JSON-serialised values differ. Used by
 * `submission.edit` to show "Changed: name, logo, pricing" without
 * dumping raw object contents.
 *
 * Non-object inputs (null, primitives, arrays) yield an empty list
 * — the row falls back to no-expander.
 */
function diffKeys(a: unknown, b: unknown): string[] {
  if (
    !a ||
    !b ||
    typeof a !== "object" ||
    typeof b !== "object" ||
    Array.isArray(a) ||
    Array.isArray(b)
  ) {
    return [];
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
  const changed: string[] = [];
  for (const k of keys) {
    if (JSON.stringify(aObj[k]) !== JSON.stringify(bObj[k])) {
      changed.push(k);
    }
  }
  return changed.sort();
}
