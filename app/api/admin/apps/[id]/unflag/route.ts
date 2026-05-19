import { NextResponse, after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  apps,
  vendors,
  vendorMembers,
  appStages,
  stages,
  appCapabilities,
  capabilities,
} from "@/lib/db/schema";
import { recordAdminAudit } from "@/lib/admin/audit";
import { sendProductUnflaggedEmail } from "@/lib/email/send-vendor-moderation";
import {
  revalidateApp,
  revalidateAppListings,
} from "@/lib/cache/revalidate";
import { revalidatePath } from "next/cache";

/**
 * POST /api/admin/apps/[id]/unflag — flips apps.flagged to false.
 * No reason field (reinstating is a reversal, not a new editorial
 * decision). Notifies the vendor with a CTA back to the public
 * listing.
 *
 * Response shape:
 *   200 { success: true, emailSent: boolean }
 *   400 invalid id
 *   401 Sign in required
 *   403 Admin only / Account suspended
 *   404 Product not found
 *   409 Not currently flagged
 *   500 Something went wrong
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await params;
  const appId = Number(idParam);
  if (!Number.isFinite(appId) || appId <= 0) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
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

  const [row] = await db
    .select({
      id: apps.id,
      slug: apps.slug,
      name: apps.name,
      flagged: apps.flagged,
      vendorContactEmail: vendors.contactEmail,
      vendorName: vendors.name,
    })
    .from(apps)
    .innerJoin(vendors, eq(vendors.id, apps.vendorId))
    .where(eq(apps.id, appId))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (!row.flagged) {
    return NextResponse.json(
      { error: "Product is not currently flagged", code: "not_flagged" },
      { status: 409 },
    );
  }

  const [stageRows, capRows] = await Promise.all([
    db
      .select({ slug: stages.slug })
      .from(appStages)
      .innerJoin(stages, eq(stages.id, appStages.stageId))
      .where(eq(appStages.appId, appId)),
    db
      .select({ slug: capabilities.slug })
      .from(appCapabilities)
      .innerJoin(capabilities, eq(capabilities.id, appCapabilities.capabilityId))
      .where(eq(appCapabilities.appId, appId)),
  ]);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(apps)
        .set({ flagged: false, updatedAt: new Date() })
        .where(eq(apps.id, appId));

      await recordAdminAudit(tx, {
        actorVendorMemberId: actor.id,
        action: "app.unflag",
        targetType: "app",
        targetId: appId,
        before: { flagged: true },
        after: { flagged: false },
      });
    });
  } catch (err) {
    console.error("[admin.app.unflag] tx failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  revalidateApp(row.slug);
  revalidateAppListings(
    stageRows.map((s) => s.slug),
    capRows.map((c) => c.slug),
  );
  revalidatePath("/dashboard", "layout");

  const contactEmail = row.vendorContactEmail;
  let emailScheduled = false;
  if (contactEmail) {
    emailScheduled = true;
    const firstName = row.vendorName.split(" ")[0] ?? "there";
    after(async () => {
      await sendProductUnflaggedEmail({
        to: contactEmail,
        firstName,
        vendorName: row.vendorName,
        productName: row.name,
        productSlug: row.slug,
      });
    });
  }

  return NextResponse.json({ success: true, emailSent: emailScheduled });
}
