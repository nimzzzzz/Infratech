import "server-only";
import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

type Tx = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

/**
 * Generic admin audit-log writer. Sibling of recordSubmissionAudit
 * (lib/submissions/admin-review.ts) — both insert into the same
 * audit_log table; this helper is for non-submission targets
 * (vendor moderation, future taxonomy curation, etc.).
 *
 * The submission-specific helper continues to exist for its narrower
 * type-safe action union; the two could be unified in a follow-up if
 * the action vocab stabilises. For now keeping both keeps each
 * surface's allowed actions explicit.
 *
 * Caller passes the open tx so the audit row commits atomically with
 * whatever action the route is performing.
 */
export async function recordAdminAudit(
  tx: Tx,
  opts: {
    actorVendorMemberId: number;
    /** Dot-namespaced action key, e.g. "vendor.suspend",
     *  "vendor.unsuspend", "vendor.delete". */
    action: string;
    /** Entity class — "vendor", "submission", "taxonomy", etc. */
    targetType: string;
    /** Stringified id of the target entity. */
    targetId: string | number;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  },
): Promise<void> {
  await tx.insert(auditLog).values({
    actorVendorMemberId: opts.actorVendorMemberId,
    action: opts.action,
    targetType: opts.targetType,
    targetId: String(opts.targetId),
    before: opts.before,
    after: opts.after,
  });
}
