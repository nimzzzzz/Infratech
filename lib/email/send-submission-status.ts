import "server-only";
import { render } from "@react-email/render";
import { getResend } from "./client";
import { fromAddress } from "./from";
import { SubmissionPublishedEmail } from "./templates/submission-published";
import { SubmissionRejectedEmail } from "./templates/submission-rejected";
import { SubmissionEditedAwaitingApprovalEmail } from "./templates/submission-edited-awaiting-approval";
import { env } from "@/lib/env";

/**
 * Send the "your product is live" email. Phase A.2 PR 1.
 *
 * Best-effort delivery — the caller fires this via next/server.after()
 * so transient Resend latency doesn't block the API response. The
 * DB transition is the source of truth; the email is a notification
 * on top.
 */
export async function sendSubmissionPublishedEmail(input: {
  to: string;
  firstName: string;
  productName: string;
  productSlug: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const resend = getResend();
    const productUrl = `${env.SITE_URL}/apps/${input.productSlug}`;
    const html = await render(
      SubmissionPublishedEmail({
        firstName: input.firstName,
        productName: input.productName,
        productUrl,
      }),
    );
    await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: `Your product is live on AllInfratech — ${input.productName}`,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[send-submission-status] published email failed for ${input.to}: ${message}`,
    );
    return { ok: false, error: message };
  }
}

/**
 * Send the "we've polished your listing — please review" email.
 * Phase A.2 PR 2 — fired from /api/admin/submissions/:id/edit.
 * Same best-effort semantics as the other two helpers.
 */
export async function sendSubmissionEditedAwaitingApprovalEmail(input: {
  to: string;
  firstName: string;
  productName: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const resend = getResend();
    const dashboardUrl = `${env.SITE_URL}/dashboard`;
    const html = await render(
      SubmissionEditedAwaitingApprovalEmail({
        firstName: input.firstName,
        productName: input.productName,
        dashboardUrl,
      }),
    );
    await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: `AllInfratech edited your submission — please review`,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[send-submission-status] edited-awaiting email failed for ${input.to}: ${message}`,
    );
    return { ok: false, error: message };
  }
}

/**
 * Send the "submission rejected" email. Phase A.2 PR 1.
 * Same best-effort semantics as sendSubmissionPublishedEmail.
 */
export async function sendSubmissionRejectedEmail(input: {
  to: string;
  firstName: string;
  productName: string;
  rejectionReason: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const resend = getResend();
    const dashboardUrl = `${env.SITE_URL}/dashboard`;
    const html = await render(
      SubmissionRejectedEmail({
        firstName: input.firstName,
        productName: input.productName,
        rejectionReason: input.rejectionReason,
        dashboardUrl,
      }),
    );
    await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: `Your AllInfratech submission needs changes — ${input.productName}`,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[send-submission-status] rejected email failed for ${input.to}: ${message}`,
    );
    return { ok: false, error: message };
  }
}
