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
import {
  publishCompanyEditInTx,
  type CompanyEditPayload,
} from "@/lib/submissions/publish-company-edit";
import {
  sendSubmissionPublishedEmail,
  sendSubmissionEditPublishedEmail,
} from "@/lib/email/send-submission-status";
import { env } from "@/lib/env";
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

  // A.4 — refuse to approve a submission FROM a suspended vendor.
  // Approving would write content (apps row, vendor row) for a company
  // that's currently hidden from the public; even if the queries filter
  // it out, the act of publishing live content from a suspended vendor
  // is a contradiction. Vendor row was loaded by loadAdminActionContext.
  if (vendor.suspended) {
    return NextResponse.json(
      {
        error:
          "This submission is from a suspended vendor. Unsuspend the company before approving.",
        code: "vendor_suspended",
      },
      { status: 409 },
    );
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

  // Explicit dispatch on submission.type — closes the latent risk of
  // routing edit-type submissions through the wrong publish helper.
  // Before this dispatch:
  //   - "new" works (existingAppId null → INSERT path)
  //   - "product_edit" worked by happy coincidence (PR 1 wires
  //     submission.appId, so the UPDATE path was taken — but nothing
  //     enforced that contract)
  //   - "company_edit" 500-ed (payload has no slug → publishSubmission
  //     InTx threw "slug required")
  //
  // Now each type routes to its correct publish helper explicitly.
  // Approve = no edits, so the vendor's payload is taken as-is.
  type ApproveResult = {
    appId: number | null;
    slug: string | null;
    productName: string;
  };
  let result: ApproveResult;
  try {
    result = await db.transaction(async (tx) => {
      let publishedAppId: number | null = null;
      let publishedSlug: string | null = null;
      let publishedProductName: string;

      if (submission.type === "company_edit") {
        await publishCompanyEditInTx(
          tx,
          submission.submitterVendorId,
          submission.payload as CompanyEditPayload,
        );
        publishedProductName = vendor.name;
      } else if (submission.type === "product_edit") {
        if (submission.appId === null) {
          throw new Error(
            "product_edit submission has no appId — refusing to publish",
          );
        }
        const final = resolveFinalPayload(
          submission.payload as PublishPayload,
          null,
        );
        const { appId, slug, name } = await publishSubmissionInTx(tx, {
          existingAppId: submission.appId,
          vendorId: submission.submitterVendorId,
          finalPayload: final,
        });
        publishedAppId = appId;
        publishedSlug = slug;
        publishedProductName = name;
      } else {
        // "new" (or the deprecated "claim" — no production writer)
        const final = resolveFinalPayload(
          submission.payload as PublishPayload,
          null,
        );
        const { appId, slug, name } = await publishSubmissionInTx(tx, {
          existingAppId: submission.appId,
          vendorId: submission.submitterVendorId,
          finalPayload: final,
        });
        publishedAppId = appId;
        publishedSlug = slug;
        publishedProductName = name;
      }

      // Status precondition prevents a concurrent admin from racing
      // an approve against an edit (the UPDATE matches 0 rows if
      // status changed under us). RETURNING used so we can detect
      // the no-op case.
      //
      // submission.publishedAt is the submission's "this was approved
      // at" timestamp — distinct from apps.publishedAt (the FIRST
      // publish date, preserved across product_edit approvals).
      const updated = await tx
        .update(submissions)
        .set({
          status: nextStatus,
          appId: publishedAppId ?? submission.appId,
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
        after: { status: nextStatus, appId: publishedAppId, type: submission.type },
      });

      return {
        appId: publishedAppId,
        slug: publishedSlug,
        productName: publishedProductName,
      };
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
  // gate the API response. Per-type dispatch: edit types use the
  // PR-3 templates ("your changes are live" copy); "new" submissions
  // continue using the original "your product is live" template.
  const contactEmail = vendor.contactEmail;
  if (contactEmail) {
    const firstName = vendor.name.split(" ")[0] ?? "there";
    if (submission.type === "company_edit") {
      after(async () => {
        await sendSubmissionEditPublishedEmail({
          to: contactEmail,
          firstName,
          kind: "company",
          name: vendor.name,
          viewUrl: `${env.SITE_URL}/vendors/${vendor.slug}`,
        });
      });
    } else if (submission.type === "product_edit" && result.slug !== null) {
      const slug = result.slug;
      after(async () => {
        await sendSubmissionEditPublishedEmail({
          to: contactEmail,
          firstName,
          kind: "product",
          name: result.productName,
          viewUrl: `${env.SITE_URL}/apps/${slug}`,
        });
      });
    } else if (result.slug !== null) {
      // "new" submission — unchanged path.
      const slug = result.slug;
      after(async () => {
        await sendSubmissionPublishedEmail({
          to: contactEmail,
          firstName,
          productName: result.productName,
          productSlug: slug,
        });
      });
    }
  }

  return NextResponse.json({
    success: true,
    appId: result.appId,
    slug: result.slug,
  });
}
