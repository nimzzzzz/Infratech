import "server-only";
import { render } from "@react-email/render";
import { getResend } from "./client";
import { fromAddress } from "./from";
import { VendorSuspendedEmail } from "./templates/vendor-suspended";
import { VendorUnsuspendedEmail } from "./templates/vendor-unsuspended";
import { env } from "@/lib/env";

/**
 * Vendor moderation notification emails (A.4 PR 1). Sent on
 * admin-triggered company suspend / unsuspend. Best-effort delivery
 * via the existing Resend client + next/server.after() pattern —
 * the DB state is the source of truth; the email is a notification
 * on top.
 *
 * Recipient: the vendor's vendors.contact_email — the company-level
 * inbox. Multi-member fan-out is a future refinement.
 *
 * Kept in its own file (not send-submission-status.ts) since vendor
 * moderation is a distinct concern from submission status changes.
 */

export async function sendVendorSuspendedEmail(input: {
  to: string;
  firstName: string;
  vendorName: string;
  reason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const resend = getResend();
    const html = await render(
      VendorSuspendedEmail({
        firstName: input.firstName,
        vendorName: input.vendorName,
        reason: input.reason,
        supportEmail: env.resend().EMAIL_CONTACT_INBOX,
      }),
    );
    await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: `Your AllInfratech listing for ${input.vendorName} has been suspended`,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[send-vendor-moderation] suspended email failed for ${input.to}: ${message}`,
    );
    return { ok: false, error: message };
  }
}

export async function sendVendorUnsuspendedEmail(input: {
  to: string;
  firstName: string;
  vendorName: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const resend = getResend();
    const dashboardUrl = `${env.SITE_URL}/dashboard`;
    const html = await render(
      VendorUnsuspendedEmail({
        firstName: input.firstName,
        vendorName: input.vendorName,
        dashboardUrl,
      }),
    );
    await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: `Your AllInfratech listing for ${input.vendorName} has been reinstated`,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[send-vendor-moderation] unsuspended email failed for ${input.to}: ${message}`,
    );
    return { ok: false, error: message };
  }
}
