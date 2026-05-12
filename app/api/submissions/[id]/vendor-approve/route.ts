import { NextResponse, after } from "next/server";
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
import {
  publishSubmissionInTx,
  resolveFinalPayload,
  type PublishPayload,
} from "@/lib/submissions/publish";
import { sendSubmissionPublishedEmail } from "@/lib/email/send-submission-status";

/**
 * POST /api/submissions/:id/vendor-approve — vendor signs off on
 * admin's edits. Phase A.2 PR 2.
 *
 * Auth: Clerk session + ownership (submission.submitter_vendor_id
 * must match the caller's vendor_members.vendor_id). Both checks
 * live in loadVendorActionContext.
 *
 * Transition: edited_awaiting_vendor_approval → published. The
 * final payload is admin_edits (not the original payload — vendor
 * is approving the polished version). publishSubmissionInTx
 * creates/updates the apps row + taxonomy joins.
 *
 * Email: "your product is live" — same template as admin.approve,
 * fired via next/server.after().
 *
 * Response shape:
 *   200 { success: true, appId, slug }
 *   400 invalid id
 *   401 / 403 / 404 — see loadVendorActionContext
 *   409 invalid_transition | state_changed
 *   422 missing_admin_edits (defensive — state machine should
 *       have caught this since admin_edits is set on every
 *       edited_awaiting_vendor_approval row, but this is the
 *       last gate)
 *   500 Something went wrong
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  const ctx = await loadVendorActionContext(id);
  if (ctx instanceof NextResponse) return ctx;
  const { actor, submission, vendor } = ctx;

  let nextStatus: SubmissionStatus;
  try {
    nextStatus = transition(
      submission.status as SubmissionStatus,
      "vendor.approve",
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

  if (!submission.adminEdits) {
    // Defensive: shouldn't happen since the only way into
    // edited_awaiting_vendor_approval is via admin.edit which sets
    // adminEdits. But if a row somehow lacks the edits, we can't
    // synthesise a final payload.
    return NextResponse.json(
      {
        error: "Admin edits missing — refresh and try again.",
        code: "missing_admin_edits",
      },
      { status: 422 },
    );
  }

  const final = resolveFinalPayload(
    submission.payload as PublishPayload,
    submission.adminEdits as PublishPayload,
  );

  let result: { appId: number; slug: string; productName: string };
  try {
    result = await db.transaction(async (tx) => {
      const { appId, slug, name } = await publishSubmissionInTx(tx, {
        existingAppId: submission.appId,
        vendorId: submission.submitterVendorId,
        finalPayload: final,
      });

      const updated = await tx
        .update(submissions)
        .set({
          status: nextStatus,
          appId,
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          publishedAt: new Date(),
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
        action: "submission.vendor_approve",
        before: { status: submission.status },
        after: { status: nextStatus, appId },
      });

      return { appId, slug, productName: name };
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
    console.error("[vendor.approve] tx failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  const contactEmail = vendor.contactEmail;
  if (contactEmail) {
    const firstName = vendor.name.split(" ")[0] ?? "there";
    after(async () => {
      await sendSubmissionPublishedEmail({
        to: contactEmail,
        firstName,
        productName: result.productName,
        productSlug: result.slug,
      });
    });
  }

  return NextResponse.json({
    success: true,
    appId: result.appId,
    slug: result.slug,
  });
}
