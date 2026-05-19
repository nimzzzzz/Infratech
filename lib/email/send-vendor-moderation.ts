import "server-only";
import { render } from "@react-email/render";
import { getResend } from "./client";
import { fromAddress } from "./from";
import { VendorSuspendedEmail } from "./templates/vendor-suspended";
import { VendorUnsuspendedEmail } from "./templates/vendor-unsuspended";
import { VendorDeletedEmail } from "./templates/vendor-deleted";
import { ProductFlaggedEmail } from "./templates/product-flagged";
import { ProductUnflaggedEmail } from "./templates/product-unflagged";
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

/**
 * Permanent-deletion notification (A.4 PR 2). Final-toned — no CTA,
 * no suggestion of restoration. Vendor can still reach the support
 * email for questions. Caller must capture the vendor's contactEmail
 * + name into closure variables BEFORE the delete transaction, since
 * the row is gone by the time after() fires this.
 */
/**
 * Product-level flag notification (A.4 PR 3). Mirrors the
 * vendor-suspend flow but scoped to a single product — only the
 * flagged listing is hidden, the rest of the vendor stays public.
 * Best-effort delivery; DB state is the source of truth.
 */
export async function sendProductFlaggedEmail(input: {
  to: string;
  firstName: string;
  vendorName: string;
  productName: string;
  reason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const resend = getResend();
    const html = await render(
      ProductFlaggedEmail({
        firstName: input.firstName,
        vendorName: input.vendorName,
        productName: input.productName,
        reason: input.reason,
        supportEmail: env.resend().EMAIL_CONTACT_INBOX,
      }),
    );
    await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: `Your AllInfratech listing for ${input.productName} has been flagged`,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[send-vendor-moderation] product-flagged email failed for ${input.to}: ${message}`,
    );
    return { ok: false, error: message };
  }
}

export async function sendProductUnflaggedEmail(input: {
  to: string;
  firstName: string;
  vendorName: string;
  productName: string;
  productSlug: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const resend = getResend();
    const productUrl = `${env.SITE_URL}/apps/${input.productSlug}`;
    const html = await render(
      ProductUnflaggedEmail({
        firstName: input.firstName,
        vendorName: input.vendorName,
        productName: input.productName,
        productUrl,
      }),
    );
    await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: `Your AllInfratech listing for ${input.productName} is back online`,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[send-vendor-moderation] product-unflagged email failed for ${input.to}: ${message}`,
    );
    return { ok: false, error: message };
  }
}

export async function sendVendorDeletedEmail(input: {
  to: string;
  firstName: string;
  vendorName: string;
  reason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const resend = getResend();
    const html = await render(
      VendorDeletedEmail({
        firstName: input.firstName,
        vendorName: input.vendorName,
        reason: input.reason,
        supportEmail: env.resend().EMAIL_CONTACT_INBOX,
      }),
    );
    await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: `Your AllInfratech listing for ${input.vendorName} has been removed`,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[send-vendor-moderation] deleted email failed for ${input.to}: ${message}`,
    );
    return { ok: false, error: message };
  }
}
