import { NextResponse, after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { vendors, vendorMembers } from "@/lib/db/schema";
import { recordAdminAudit } from "@/lib/admin/audit";
import { sendVendorSuspendedEmail } from "@/lib/email/send-vendor-moderation";

const bodySchema = z.object({
  /** Optional admin-supplied reason — stored on the audit_log row and
   *  rendered verbatim in the vendor's notification email if provided. */
  reason: z.string().trim().max(1000).optional(),
});

/**
 * POST /api/admin/vendors/[id]/suspend — flips vendors.suspended to
 * true. Writes a vendor.suspend audit row inside the same transaction
 * with the optional reason in the after-payload. Sends a notification
 * email to the vendor's contact_email via next/server.after().
 *
 * Response shape:
 *   200 { success: true, emailSent: boolean }
 *   400 invalid id / invalid body
 *   401 Sign in required
 *   403 Admin only / Account suspended
 *   404 Vendor not found
 *   409 Already suspended
 *   500 Something went wrong
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await params;
  const vendorId = Number(idParam);
  if (!Number.isFinite(vendorId) || vendorId <= 0) {
    return NextResponse.json({ error: "Invalid vendor id" }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const [actor] = await db
    .select()
    .from(vendorMembers)
    .where(eq(vendorMembers.clerkUserId, userId))
    .limit(1);
  if (!actor) {
    return NextResponse.json(
      { error: "Vendor account not found" },
      { status: 404 },
    );
  }
  if (!actor.isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  if (actor.suspended) {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  let json: unknown = {};
  try {
    json = await req.json();
  } catch {
    // Empty body is fine — reason is optional.
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const reason = parsed.data.reason && parsed.data.reason.length > 0
    ? parsed.data.reason
    : undefined;

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, vendorId))
    .limit(1);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }
  if (vendor.suspended) {
    return NextResponse.json(
      { error: "Vendor is already suspended", code: "already_suspended" },
      { status: 409 },
    );
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(vendors)
        .set({ suspended: true, updatedAt: new Date() })
        .where(eq(vendors.id, vendorId));

      await recordAdminAudit(tx, {
        actorVendorMemberId: actor.id,
        action: "vendor.suspend",
        targetType: "vendor",
        targetId: vendorId,
        before: { suspended: false },
        after: { suspended: true, reason: reason ?? null },
      });
    });
  } catch (err) {
    console.error("[admin.vendor.suspend] tx failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Broad cache invalidation — vendor's apps may live on many specific
  // paths (home, multiple stage/capability/industry pages, individual
  // app pages, the vendor profile). Layout-level nuke is cheaper than
  // enumerating; vendor moderation is rare so the cost is negligible.
  revalidatePath("/", "layout");

  // Fire the notification email after the response — Resend latency
  // must not gate the API. Gated on contact_email presence.
  const contactEmail = vendor.contactEmail;
  let emailScheduled = false;
  if (contactEmail) {
    emailScheduled = true;
    const firstName = vendor.name.split(" ")[0] ?? "there";
    after(async () => {
      await sendVendorSuspendedEmail({
        to: contactEmail,
        firstName,
        vendorName: vendor.name,
        reason,
      });
    });
  }

  return NextResponse.json({ success: true, emailSent: emailScheduled });
}
