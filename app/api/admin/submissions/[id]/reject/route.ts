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
  sendSubmissionRejectedEmail,
  sendSubmissionEditRejectedEmail,
} from "@/lib/email/send-submission-status";
import { env } from "@/lib/env";
import { rejectBodySchema } from "./schema";

/**
 * POST /api/admin/submissions/:id/reject — admin rejects with a
 * required reason. Transitions pending_review → rejected. Fires
 * the "submission needs changes" email via next/server.after().
 *
 * Response shape:
 *   200 { success: true }
 *   400 invalid id / invalid body / reason too short
 *   401 / 403 / 404 — see loadAdminActionContext
 *   409 invalid_transition / state_changed
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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = rejectBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const reason = parsed.data.reason;

  let nextStatus: SubmissionStatus;
  try {
    nextStatus = transition(
      submission.status as SubmissionStatus,
      "admin.reject",
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

  try {
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(submissions)
        .set({
          status: nextStatus,
          rejectionReason: reason,
          // Clear any previous admin_edits — the submission is
          // rejected outright, not edited.
          adminEdits: null,
          vendorFeedback: null,
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
        action: "submission.reject",
        before: { status: submission.status },
        after: { status: nextStatus, rejectionReason: reason },
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
    console.error("[admin.reject] tx failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Fire rejection email. Per-type dispatch: edit types use the
  // PR-3 templates ("your changes need revisions" copy with a
  // reassurance line that the live listing is unaffected); "new"
  // submissions continue using the original "submission needs
  // changes" template.
  //
  // This branch also closes a latent miscall from PR 2: the prior
  // code fired sendSubmissionRejectedEmail for ALL types, reading
  // payload.name. For company_edit submissions the payload has no
  // `name` key (only companyName) — so the vendor got an email
  // saying "we weren't able to publish your product" when they had
  // rejected a company profile edit. Not data-corrupting, but
  // confusingly worded; now fixed.
  const contactEmail = vendor.contactEmail;
  if (contactEmail) {
    const firstName = vendor.name.split(" ")[0] ?? "there";
    if (submission.type === "company_edit") {
      after(async () => {
        await sendSubmissionEditRejectedEmail({
          to: contactEmail,
          firstName,
          kind: "company",
          name: vendor.name,
          rejectionReason: reason,
          editPageUrl: `${env.SITE_URL}/dashboard/company`,
        });
      });
    } else if (submission.type === "product_edit" && submission.appId !== null) {
      const productName =
        (submission.payload as { name?: string })?.name ?? "your product";
      const appId = submission.appId;
      after(async () => {
        await sendSubmissionEditRejectedEmail({
          to: contactEmail,
          firstName,
          kind: "product",
          name: productName,
          rejectionReason: reason,
          editPageUrl: `${env.SITE_URL}/dashboard/products/${appId}/edit`,
        });
      });
    } else {
      // "new" submission — unchanged path.
      const productName =
        (submission.payload as { name?: string })?.name ?? "your product";
      after(async () => {
        await sendSubmissionRejectedEmail({
          to: contactEmail,
          firstName,
          productName,
          rejectionReason: reason,
        });
      });
    }
  }

  return NextResponse.json({ success: true });
}
