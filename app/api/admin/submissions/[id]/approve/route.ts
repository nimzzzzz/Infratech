import { NextResponse, after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import {
  loadAdminActionContext,
  recordSubmissionAudit,
} from "@/lib/submissions/admin-review";
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
import { approveBodySchema } from "./schema";

/**
 * POST /api/admin/submissions/:id/approve — admin approves a
 * submission as-is (no edits). Transitions pending_review →
 * published, creates/updates the apps row + taxonomy joins,
 * writes the audit row, fires the "your product is live" email
 * via next/server.after().
 *
 * Response shape:
 *   200 { success: true, appId, slug }
 *   400 invalid id / invalid JSON body
 *   401 Sign in required
 *   403 Admin only / Account suspended
 *   404 Submission not found
 *   409 invalid_transition (state machine) OR state_changed (race)
 *   500 Something went wrong
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  const ctx = await loadAdminActionContext(id);
  if (ctx instanceof NextResponse) return ctx;
  const { actor, submission, vendor } = ctx;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    // Empty body is fine for approve — schema makes everything optional.
    json = {};
  }
  const parsed = approveBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  if (parsed.data.website4 && parsed.data.website4.trim().length > 0) {
    return NextResponse.json({ success: true });
  }

  // State machine — throws on invalid transition.
  let nextStatus: SubmissionStatus;
  try {
    nextStatus = transition(
      submission.status as SubmissionStatus,
      "admin.approve",
      "admin",
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

  // Resolve the final payload. Approve = no edits, so the vendor's
  // payload is taken as-is. (vendor.approve in PR 2 will pass
  // admin_edits.)
  const final = resolveFinalPayload(
    submission.payload as PublishPayload,
    null,
  );

  let result: { appId: number; slug: string; productName: string };
  try {
    result = await db.transaction(async (tx) => {
      const { appId, slug, name } = await publishSubmissionInTx(tx, {
        existingAppId: submission.appId,
        vendorId: submission.submitterVendorId,
        finalPayload: final,
      });

      // Status precondition prevents a concurrent admin from racing
      // an approve against an edit (the UPDATE matches 0 rows if
      // status changed under us). RETURNING used so we can detect
      // the no-op case.
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
      if (updated.length === 0) {
        throw new Error("state_changed");
      }

      await recordSubmissionAudit(tx, {
        actorVendorMemberId: actor.id,
        submissionId: submission.id,
        action: "submission.approve",
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
    console.error("[admin.approve] tx failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Fire the email after the response — Resend latency must not
  // gate the API response.
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
