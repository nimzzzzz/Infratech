import "server-only";
import { render } from "@react-email/render";
import { getResend } from "./client";
import { fromAddress, contactInbox } from "./from";
import { VendorInquiryEmail } from "./templates/vendor-inquiry";
import { VisitorConfirmationEmail } from "./templates/visitor-confirmation";
import { env } from "@/lib/env";

export type SendContactInput = {
  app: { name: string; slug: string };
  vendor: { name: string; contactEmail: string };
  visitor: {
    name: string;
    email: string;
    company?: string | null;
    role?: string | null;
  };
  subject?: string;
  message: string;
};

export type SendContactResult = {
  vendorEmail: { ok: boolean; error?: string };
  visitorEmail: { ok: boolean; error?: string };
};

/**
 * Sends the two transactional emails for a contact inquiry, in parallel:
 *
 *   1. Vendor inquiry  — TO vendor.contactEmail, BCC contact-inbox,
 *                        Reply-To visitor.email so the vendor's reply
 *                        skips us entirely.
 *   2. Visitor receipt — TO visitor.email, no BCC.
 *
 * Each send is independently fire-and-resolve — one failure does not
 * abort the other. The caller (the API route) treats either failure as
 * non-fatal: the contact_messages row already landed; mail is best-
 * effort delivery on top.
 */
export async function sendContactInquiry(
  input: SendContactInput,
): Promise<SendContactResult> {
  const resend = getResend();
  const from = fromAddress();
  const bcc = contactInbox();
  const appUrl = `${env.SITE_URL}/apps/${input.app.slug}`;

  const vendorHtml = await render(
    VendorInquiryEmail({
      appName: input.app.name,
      appSlug: input.app.slug,
      appUrl,
      vendorName: input.vendor.name,
      visitor: {
        name: input.visitor.name,
        email: input.visitor.email,
        company: input.visitor.company ?? undefined,
        role: input.visitor.role ?? undefined,
      },
      subject: input.subject,
      message: input.message,
    }),
  );

  const visitorHtml = await render(
    VisitorConfirmationEmail({
      appName: input.app.name,
      appUrl,
      vendorName: input.vendor.name,
      visitorName: input.visitor.name,
      siteUrl: env.SITE_URL,
    }),
  );

  // Auto-generated subject per the Stage 3 spec — uses visitor name +
  // app name, ignores any user-typed subject (which appears inside the
  // body row instead so the vendor still sees it).
  const vendorSubject = `Inquiry about ${input.app.name} from ${input.visitor.name}`;
  const visitorSubject = `Your message to ${input.vendor.name} was sent`;

  const [vendorRes, visitorRes] = await Promise.allSettled([
    resend.emails.send({
      from,
      to: input.vendor.contactEmail,
      bcc,
      replyTo: input.visitor.email,
      subject: vendorSubject,
      html: vendorHtml,
    }),
    resend.emails.send({
      from,
      to: input.visitor.email,
      subject: visitorSubject,
      html: visitorHtml,
    }),
  ]);

  return {
    vendorEmail: settled(vendorRes),
    visitorEmail: settled(visitorRes),
  };
}

function settled(
  r: PromiseSettledResult<unknown>,
): { ok: boolean; error?: string } {
  if (r.status === "fulfilled") return { ok: true };
  const err = r.reason;
  return {
    ok: false,
    error: err instanceof Error ? err.message : String(err),
  };
}
