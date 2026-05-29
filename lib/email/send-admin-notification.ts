import "server-only";
import { eq } from "drizzle-orm";
import { render } from "@react-email/render";
import { db } from "@/lib/db/client";
import { submissions, vendors, type SubmissionType } from "@/lib/db/schema";
import { getResend } from "./client";
import { fromAddress } from "./from";
import { AdminSubmissionReceivedEmail } from "./templates/admin-submission-received";
import { getAdminEmails } from "@/lib/auth/admin-allowlist";
import { env } from "@/lib/env";

/**
 * Notify all admins that a submission needs review.
 *
 * Fires on submission creation across the three live types (new,
 * product_edit, company_edit). Recipients come from CLERK_ADMIN_EMAILS
 * via getAdminEmails(); the mail is addressed To the From address and
 * BCCs the admins so they don't see each other's addresses.
 *
 * Best-effort delivery — the caller fires this via next/server.after()
 * so Resend latency never blocks the submission response. The DB row is
 * the source of truth; this is a notification on top. The helper does
 * its own lookups (vendor name, product name from payload) so the three
 * route writers stay thin.
 *
 * Empty allowlist → log a warning and return ok (nothing to send is not
 * a failure).
 */
export async function notifyAdminsOfSubmission(input: {
  submissionId: number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const [row] = await db
      .select({
        type: submissions.type,
        payload: submissions.payload,
        vendorName: vendors.name,
      })
      .from(submissions)
      .innerJoin(vendors, eq(vendors.id, submissions.submitterVendorId))
      .where(eq(submissions.id, input.submissionId))
      .limit(1);

    if (!row) {
      console.error(
        `[admin-notification] submission ${input.submissionId} not found`,
      );
      return { ok: false, error: "submission_not_found" };
    }

    const recipients = getAdminEmails();
    if (recipients.length === 0) {
      console.warn(
        `[admin-notification] CLERK_ADMIN_EMAILS is empty — no recipients for submission ${input.submissionId}`,
      );
      return { ok: true };
    }

    const type = row.type as SubmissionType;
    const payload = (row.payload ?? {}) as {
      name?: unknown;
      tagline?: unknown;
    };
    const productName =
      type === "company_edit" || typeof payload.name !== "string"
        ? null
        : payload.name;
    const summary = buildSummary(type, payload);
    const subject = buildSubject(type, productName, row.vendorName);
    const reviewUrl = `${env.SITE_URL}/admin/submissions/${input.submissionId}`;

    const from = fromAddress();
    const html = await render(
      AdminSubmissionReceivedEmail({
        submissionType: type,
        vendorName: row.vendorName,
        productName,
        summary,
        reviewUrl,
      }),
    );

    const resend = getResend();
    await resend.emails.send({
      from,
      // No personal To — the admins are BCC'd so the list stays private.
      to: from,
      bcc: recipients,
      subject,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[admin-notification] send failed for submission ${input.submissionId}: ${message}`,
    );
    return { ok: false, error: message };
  }
}

function buildSubject(
  type: SubmissionType,
  productName: string | null,
  vendorName: string,
): string {
  switch (type) {
    case "product_edit":
      return `Product edit for review: ${productName ?? vendorName}`;
    case "company_edit":
      return `Company profile edit for review: ${vendorName}`;
    case "new":
    default:
      return `New submission for review: ${productName ?? vendorName}`;
  }
}

function buildSummary(
  type: SubmissionType,
  payload: { tagline?: unknown },
): string {
  const base =
    type === "product_edit"
      ? "Edit to an existing product"
      : type === "company_edit"
        ? "Edit to company profile"
        : "New product submission";
  // Surface the tagline when the payload carries one (new / product_edit);
  // company_edit has no tagline. Keep it to one line.
  if (typeof payload.tagline === "string" && payload.tagline.trim()) {
    return `${base} — “${payload.tagline.trim()}”`;
  }
  return base;
}
