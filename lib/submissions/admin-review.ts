import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  submissions,
  vendorMembers,
  vendors,
  auditLog,
  type Submission,
  type VendorMember,
  type Vendor,
} from "@/lib/db/schema";

/** See lib/submissions/publish.ts for why this Tx type is extracted
 *  via Parameters<...> rather than imported directly from drizzle. */
type Tx = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

/**
 * Shared auth + lookup helper for admin submission-action endpoints
 * (approve / edit / reject). Returns the resolved actor + submission
 * + the submitting vendor on success, or a NextResponse to short-
 * circuit the route on failure.
 *
 * Usage in a route:
 *
 *   const ctx = await loadAdminActionContext(id);
 *   if (ctx instanceof NextResponse) return ctx;
 *   const { actor, submission, vendor } = ctx;
 *
 * The actor is the vendor_members row with is_admin=true. Submission
 * is fetched fresh inside this call so the route always sees the
 * latest status (used for the optimistic-concurrency precondition
 * later).
 */
export type AdminActionContext = {
  actor: VendorMember;
  submission: Submission;
  vendor: Vendor;
};

export async function loadAdminActionContext(
  submissionId: number,
): Promise<AdminActionContext | NextResponse> {
  if (!Number.isFinite(submissionId) || submissionId <= 0) {
    return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const [actor] = await db
    .select()
    .from(vendorMembers)
    .where(eq(vendorMembers.clerkUserId, userId))
    .limit(1);
  if (!actor) {
    return NextResponse.json(
      { error: "Vendor account not found" },
      { status: 404 },
    );
  }
  if (!actor.isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  if (actor.suspended) {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, submission.submitterVendorId))
    .limit(1);
  if (!vendor) {
    return NextResponse.json(
      { error: "Submitting vendor not found" },
      { status: 500 },
    );
  }

  return { actor, submission, vendor };
}

/**
 * Append an audit_log row for a submission state transition.
 * Records the actor (vendor_members.id), the action, before/after
 * status, and any structured payload (admin_edits, rejection_reason).
 * Caller passes the open tx so the audit row commits atomically
 * with the submission update.
 */
export async function recordSubmissionAudit(
  tx: Tx,
  opts: {
    actorVendorMemberId: number;
    submissionId: number;
    action:
      | "submission.approve"
      | "submission.edit"
      | "submission.reject"
      | "submission.vendor_approve"
      | "submission.vendor_request_changes"
      | "submission.resubmit";
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  },
): Promise<void> {
  await tx.insert(auditLog).values({
    adminId: null,
    actorVendorMemberId: opts.actorVendorMemberId,
    action: opts.action,
    targetType: "submission",
    targetId: String(opts.submissionId),
    before: opts.before,
    after: opts.after,
  });
}
