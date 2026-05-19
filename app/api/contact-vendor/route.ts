import { NextResponse, after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getAppContactContext,
  recordContactMessage,
} from "@/lib/queries/messages";
import { sendContactInquiry } from "@/lib/email/send-contact";
import { checkRateLimit } from "@/lib/email/rate-limit";

/**
 * POST /api/contact-vendor — visitor → vendor inquiry pipeline.
 *
 * Order of operations (and why):
 *
 *   1. Rate-limit by IP (per-instance, in-memory, 5/hour).
 *   2. Validate body with Zod. Field errors flatten into 400 JSON so
 *      the form can render them inline.
 *   3. Honeypot check — the form has a hidden `website` input that
 *      real users can't see; if it's non-empty, return success but
 *      drop the request silently. Don't tell the bot.
 *   4. Look up the app + vendor. Draft / unknown apps both 404 — we
 *      don't leak that a slug exists in draft state.
 *   5. Suspended vendor → 503.
 *   6. Vendor missing contact_email → 503 — same UX as suspended.
 *   7. AWAIT the contact_messages insert. The DB row is the source of
 *      truth for the inquiry; mail is a best-effort projection on top.
 *      Awaiting means we can return an honest 200 only after the
 *      inquiry is durable.
 *   8. Schedule the email send via after() so transient Resend latency
 *      / hiccups don't block the response. If the send fails the row
 *      is still on file and the admin team has the full message in
 *      the dashboard inbox.
 *
 * Response shape:
 *   200 { success: true }
 *   400 { error: "Invalid input", fieldErrors: { ... } }
 *   404 { error: "Tool not found" }
 *   429 { error: "Too many requests, please try again in an hour" }
 *   503 { error: "This vendor is not currently accepting inquiries" }
 *   500 { error: "Something went wrong" }
 */

// Hard caps match the form's maxLength attributes; spec calls for these.
const bodySchema = z.object({
  appSlug: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  role: z.string().trim().max(200).optional().or(z.literal("")),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(5000),
  // Honeypot — must always be empty for real users. Bots fill every
  // input they see, so a non-empty value is a near-perfect spam signal.
  website: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  // Rate limit. Behind Vercel's proxy, the client IP is in
  // x-forwarded-for; the first comma-separated entry is the original
  // client. Fall back to a constant key if the header is missing —
  // marginally noisier on local dev, fine in prod.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests, please try again in an hour" },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
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

  // Honeypot — silent success.
  if (body.website && body.website.trim().length > 0) {
    return NextResponse.json({ success: true });
  }

  // Look up the app + vendor.
  const ctx = await getAppContactContext(body.appSlug);
  if (!ctx) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }
  if (ctx.vendor.suspended || !ctx.vendor.contactEmail) {
    return NextResponse.json(
      { error: "This vendor is not currently accepting inquiries" },
      { status: 503 },
    );
  }

  // Persist first. Row is the source of truth — if this fails, the
  // 500 is honest. Empty optional fields normalise to null so the row
  // matches what the dashboard query expects.
  try {
    await recordContactMessage({
      appId: ctx.app.id,
      vendorId: ctx.vendor.id,
      senderName: body.name,
      senderEmail: body.email,
      senderCompany: body.company ? body.company : null,
      senderRole: body.role ? body.role : null,
      subject: body.subject || `Inquiry about ${ctx.app.name}`,
      body: body.message,
    });
  } catch (err) {
    console.error("[contact-vendor] DB insert failed", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }

  // Schedule the mail send. Failures are logged; they don't change the
  // 200 we're about to return because the inquiry already landed in
  // contact_messages.
  const vendorContactEmail = ctx.vendor.contactEmail;
  after(async () => {
    try {
      const result = await sendContactInquiry({
        app: { name: ctx.app.name, slug: ctx.app.slug },
        vendor: { name: ctx.vendor.name, contactEmail: vendorContactEmail },
        visitor: {
          name: body.name,
          email: body.email,
          company: body.company || null,
          role: body.role || null,
        },
        subject: body.subject || undefined,
        message: body.message,
      });
      if (!result.vendorEmail.ok) {
        console.error(
          "[contact-vendor] vendor email send failed",
          result.vendorEmail.error,
        );
      }
      if (!result.visitorEmail.ok) {
        console.error(
          "[contact-vendor] visitor confirmation send failed",
          result.visitorEmail.error,
        );
      }
    } catch (err) {
      console.error("[contact-vendor] sendContactInquiry threw", err);
    }
  });

  // Surgical — this route fires on every visitor inquiry; nuking the
  // whole layout cache would be wasteful. Only the vendor's inbox at
  // /dashboard/messages and the admin's /admin/inquiries are
  // affected by a new row in contact_messages.
  revalidatePath("/dashboard/messages");
  revalidatePath("/admin/inquiries");

  return NextResponse.json({ success: true });
}
