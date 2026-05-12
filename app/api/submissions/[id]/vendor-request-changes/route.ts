import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import { loadVendorActionContext } from "@/lib/submissions/vendor-action";
import { recordSubmissionAudit } from "@/lib/submissions/admin-review";
import {
  transition,
  InvalidTransitionError,
  type SubmissionStatus,
} from "@/lib/submissions/state-machine";
import { vendorRequestChangesBodySchema } from "./schema";

/**
 * POST /api/submissions/:id/vendor-request-changes — vendor sends
 * a submission back to admin with a feedback note. Phase A.2 PR 2.
 *
 * Transition: edited_awaiting_vendor_approval → pending_review.
 * Side effects: submission.vendor_feedback = body.feedback;
 * admin_edits stay on the row (so admin can see what they had
 * proposed when they revisit). Audit row.
 *
 * No email to admin per spec — admin sees the feedback banner the
 * next time they open /admin/submissions/:id (the detail page
 * already renders vendor_feedback in an amber callout, wired in
 * PR 1).
 *
 * Response shape:
 *   200 { success: true }
 *   400 invalid id / invalid body
 *   401 / 403 / 404 — see loadVendorActionContext
 *   409 invalid_transition | state_changed
 *   500 Something went wrong
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  const ctx = await loadVendorActionContext(id);
  if (ctx instanceof NextResponse) return ctx;
  const { actor, submission } = ctx;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = vendorRequestChangesBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid input",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const feedback = parsed.data.feedback;

  let nextStatus: SubmissionStatus;
  try {
    nextStatus = transition(
      submission.status as SubmissionStatus,
      "vendor.request_changes",
      "vendor",
    );
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return NextResponse.json(
        {
          error: err.message,
          code: "invalid_transition",
          currentStatus: submission.status,
        },
        { status: 409 },
      );
    }
    throw err;
  }

  try {
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(submissions)
        .set({
          status: nextStatus,
          vendorFeedback: feedback,
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(submissions.id, submission.id),
            eq(submissions.status, submission.status),
          ),
        )
        .returning({ id: submissions.id });
      if (updated.length === 0) throw new Error("state_changed");

      await recordSubmissionAudit(tx, {
        actorVendorMemberId: actor.id,
        submissionId: submission.id,
        action: "submission.vendor_request_changes",
        before: { status: submission.status },
        after: { status: nextStatus, vendorFeedback: feedback },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "state_changed") {
      return NextResponse.json(
        {
          error: "Submission was modified while you were reviewing it. Refresh.",
          code: "state_changed",
        },
        { status: 409 },
      );
    }
    console.error("[vendor.request_changes] tx failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
