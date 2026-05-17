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
import { sendSubmissionEditedAwaitingApprovalEmail } from "@/lib/email/send-submission-status";
import { editBodySchema } from "./schema";

/**
 * POST /api/admin/submissions/:id/edit — admin saves edits to a
 * pending submission. Transitions pending_review →
 * edited_awaiting_vendor_approval. The vendor must approve the
 * edits before publish (vendor-approve endpoint in PR 2).
 *
 * Body fields are individually optional — the route merges them
 * over the existing submission.payload to construct adminEdits.
 * Fields the admin doesn't change inherit from payload, so the
 * vendor's diff view only highlights actual deltas.
 *
 * Email notification fires in PR 2 when vendor-side endpoints
 * land — for PR 1 the vendor sees the diff next time they visit
 * the dashboard. (No email here to avoid silent vendor surprise
 * when the dashboard-card UI isn't built yet.)
 *
 * Response shape:
 *   200 { success: true, status, adminEdits }
 *   400 invalid id / invalid body
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
  const { actor, submission } = ctx;

  // admin.edit is meaningful only for brand-new product submissions
  // where the admin polishes copy before publish. For company_edit
  // and product_edit the admin should approve or reject — editing
  // the vendor's edit creates a confusing extra round trip. The UI
  // also hides the Edit button for edit types; this gate is defence
  // in depth against a direct API call.
  if (submission.type !== "new") {
    return NextResponse.json(
      {
        error:
          "admin.edit is not available for edit-type submissions. Use approve or reject.",
        code: "invalid_for_type",
        type: submission.type,
      },
      { status: 400 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = editBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  let nextStatus: SubmissionStatus;
  try {
    nextStatus = transition(
      submission.status as SubmissionStatus,
      "admin.edit",
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

  // Construct admin_edits by overlaying the supplied fields on the
  // existing payload. Storing the full edited payload (not a diff)
  // keeps the vendor-approve path simple — it just hands adminEdits
  // straight to publishSubmissionInTx.
  const payload = submission.payload as Record<string, unknown>;
  const edits = parsed.data;
  const adminEdits: Record<string, unknown> = {
    ...payload,
    ...Object.fromEntries(
      Object.entries(edits).filter(([, v]) => v !== undefined),
    ),
  };

  try {
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(submissions)
        .set({
          status: nextStatus,
          adminEdits,
          // Clear any vendor feedback from a previous round-trip —
          // this is a fresh admin pass.
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
        action: "submission.edit",
        before: { status: submission.status, payload },
        after: { status: nextStatus, adminEdits },
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
    console.error("[admin.edit] tx failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Fire the "we've polished your listing" email after the
  // transaction commits. Best-effort via after(); Resend latency
  // must not gate the API response. PR 2 wiring (PR 1 shipped the
  // state transition without notifying the vendor).
  const contactEmail = ctx.vendor.contactEmail;
  if (contactEmail) {
    const firstName = ctx.vendor.name.split(" ")[0] ?? "there";
    const productName =
      (adminEdits as { name?: string })?.name ??
      (submission.payload as { name?: string })?.name ??
      "your product";
    after(async () => {
      await sendSubmissionEditedAwaitingApprovalEmail({
        to: contactEmail,
        firstName,
        productName,
      });
    });
  }

  return NextResponse.json({
    success: true,
    status: nextStatus,
    adminEdits,
  });
}
