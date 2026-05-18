import { NextResponse, after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { vendors, vendorMembers } from "@/lib/db/schema";
import { recordAdminAudit } from "@/lib/admin/audit";
import { sendVendorUnsuspendedEmail } from "@/lib/email/send-vendor-moderation";

/**
 * POST /api/admin/vendors/[id]/unsuspend — flips vendors.suspended to
 * false. Audit row + notification email; no reason field (reinstating
 * is a reversal, not a new editorial decision).
 *
 * Response shape:
 *   200 { success: true, emailSent: boolean }
 *   400 invalid id
 *   401 Sign in required
 *   403 Admin only / Account suspended
 *   404 Vendor not found
 *   409 Not currently suspended
 *   500 Something went wrong
 */
export async function POST(
  _req: Request,
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

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, vendorId))
    .limit(1);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }
  if (!vendor.suspended) {
    return NextResponse.json(
      { error: "Vendor is not currently suspended", code: "not_suspended" },
      { status: 409 },
    );
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(vendors)
        .set({ suspended: false, updatedAt: new Date() })
        .where(eq(vendors.id, vendorId));

      await recordAdminAudit(tx, {
        actorVendorMemberId: actor.id,
        action: "vendor.unsuspend",
        targetType: "vendor",
        targetId: vendorId,
        before: { suspended: true },
        after: { suspended: false },
      });
    });
  } catch (err) {
    console.error("[admin.vendor.unsuspend] tx failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  revalidatePath("/", "layout");

  const contactEmail = vendor.contactEmail;
  let emailScheduled = false;
  if (contactEmail) {
    emailScheduled = true;
    const firstName = vendor.name.split(" ")[0] ?? "there";
    after(async () => {
      await sendVendorUnsuspendedEmail({
        to: contactEmail,
        firstName,
        vendorName: vendor.name,
      });
    });
  }

  return NextResponse.json({ success: true, emailSent: emailScheduled });
}
