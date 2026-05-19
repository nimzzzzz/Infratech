import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
import { TERMS_VERSION } from "@/lib/legal/terms-version";
import { needsReacceptance } from "@/lib/legal/check-acceptance";
import { checkVendorMemberRateLimit } from "@/lib/rate-limit/vendor-member";
import { submissionBodySchema } from "@/app/api/submissions/schema";

/**
 * POST /api/submissions/:id/resubmit — vendor edits a rejected
 * submission and resends it for review. Phase A.2 PR 2.
 *
 * Auth: Clerk session + ownership (loadVendorActionContext).
 * Re-acceptance gate: if the vendor's latest accepted version is
 * older than the live TERMS_VERSION, return 409 version_mismatch.
 * The dashboard's layout-mounted modal will pick this up on
 * router.refresh() (same mechanism as the original /api/submissions
 * endpoint).
 *
 * Body: full submission payload (same Zod schema as the original
 * /api/submissions endpoint — vendors aren't editing partial
 * fields, they're resubmitting the whole thing).
 *
 * Transition: rejected → pending_review.
 * Side effects: replace submission.payload, clear rejection_reason,
 * clear admin_edits (defensive — already null on rejected rows),
 * clear vendor_feedback. Audit row.
 *
 * Rate limit: same in-memory Map pattern (5/hr per vendor_member.id)
 * used elsewhere. Cap a misbehaving client from flapping the
 * status of a submission.
 *
 * Response shape:
 *   200 { success: true, submissionId, redirectUrl }
 *   400 invalid id / invalid body
 *   401 / 403 / 404 — see loadVendorActionContext
 *   409 invalid_transition | state_changed | version_mismatch
 *   429 Too many requests
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

  // Re-acceptance gate. Belt-and-braces — the dashboard's layout
  // modal blocks at the UI level too, but a direct client POST
  // could bypass that.
  if (await needsReacceptance(actor.id)) {
    return NextResponse.json(
      {
        error: "Our terms have been updated. Please re-accept to continue.",
        code: "version_mismatch",
        currentVersion: TERMS_VERSION,
      },
      { status: 409 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = submissionBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid input",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Honeypot — silent success, no writes. Matches the original
  // /api/submissions handler.
  if (body.website3 && body.website3.trim().length > 0) {
    return NextResponse.json({ success: true });
  }

  if (!checkVendorMemberRateLimit(actor.id)) {
    return NextResponse.json(
      { error: "Too many requests, please try again in an hour" },
      { status: 429 },
    );
  }

  let nextStatus: SubmissionStatus;
  try {
    nextStatus = transition(
      submission.status as SubmissionStatus,
      "vendor.resubmit",
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

  // Construct the new payload from the request body. Same shape as
  // the original /api/submissions writer — the new payload
  // overwrites the rejected one entirely.
  const newPayload = {
    slug: submission.payload && typeof submission.payload === "object"
      ? (submission.payload as { slug?: string }).slug
      : undefined,
    // Re-derive slug from name if the original slug isn't on the row
    // (shouldn't happen — original endpoint always wrote one).
    name: body.name.trim(),
    url: body.url.trim(),
    tagline: body.tagline.trim(),
    description: body.description.trim(),
    stages: body.stages,
    capabilities: body.capabilities,
    industries: body.industries,
    pricingModels: body.pricingModels,
    customCapabilities: body.customCapabilities ?? [],
    customIndustries: body.customIndustries ?? [],
    customPricing: body.pricingModels.includes("__custom__") ? body.customPricing : null,
    termsVersionAtSubmit: TERMS_VERSION,
  };

  try {
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(submissions)
        .set({
          status: nextStatus,
          payload: newPayload,
          // Clear rejection-cycle state — fresh start.
          rejectionReason: null,
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
        action: "submission.resubmit",
        before: {
          status: submission.status,
          payload: submission.payload,
        },
        after: { status: nextStatus, payload: newPayload },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "state_changed") {
      return NextResponse.json(
        {
          error: "Submission was modified while you were editing it. Refresh.",
          code: "state_changed",
        },
        { status: 409 },
      );
    }
    console.error("[vendor.resubmit] tx failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Resubmission flips the rejected → pending_review transition;
  // vendor's dashboard reflects the status change.
  revalidatePath("/dashboard", "layout");

  return NextResponse.json({
    success: true,
    submissionId: submission.id,
    redirectUrl: `/dashboard/onboarding/submitted?name=${encodeURIComponent(body.name.trim())}`,
  });
}
