import { NextResponse, after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
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
import { sendProductFlaggedEmail } from "@/lib/email/send-vendor-moderation";
import {
  revalidateApp,
  revalidateAppListings,
} from "@/lib/cache/revalidate";
import { revalidatePath } from "next/cache";

const bodySchema = z.object({
  /** Optional admin-supplied reason — stored on the audit_log row and
   *  rendered verbatim in the vendor's notification email if provided. */
  reason: z.string().trim().max(1000).optional(),
});

/**
 * POST /api/admin/apps/[id]/flag — flips apps.flagged to true.
 * Restricted to status="published" (a draft/pending product is
 * already off the public side, so the flag overlay would be a no-op).
 * Independent of status — a flagged product stays at "published"
 * but every public reader filters it out via the AND condition added
 * in this PR.
 *
 * Response shape:
 *   200 { success: true, emailSent: boolean }
 *   400 invalid id / invalid body / not_published
 *   401 Sign in required
 *   403 Admin only / Account suspended
 *   404 Product not found
 *   409 Already flagged
 *   500 Something went wrong
 */
export async function POST(
  req: Request,
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
  const reason =
    parsed.data.reason && parsed.data.reason.length > 0
      ? parsed.data.reason
      : undefined;

  const [row] = await db
    .select({
      id: apps.id,
      slug: apps.slug,
      name: apps.name,
      status: apps.status,
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
  if (row.status !== "published") {
    return NextResponse.json(
      {
        error: "Only published products can be flagged",
        code: "not_published",
      },
      { status: 400 },
    );
  }
  if (row.flagged) {
    return NextResponse.json(
      { error: "Product is already flagged", code: "already_flagged" },
      { status: 409 },
    );
  }

  // Stages + capabilities slugs — needed for cache invalidation across
  // landing pages that list this product.
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
        .set({ flagged: true, updatedAt: new Date() })
        .where(eq(apps.id, appId));

      await recordAdminAudit(tx, {
        actorVendorMemberId: actor.id,
        action: "app.flag",
        targetType: "app",
        targetId: appId,
        before: { flagged: false },
        after: { flagged: true, reason: reason ?? null },
      });
    });
  } catch (err) {
    console.error("[admin.app.flag] tx failed", err);
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
      await sendProductFlaggedEmail({
        to: contactEmail,
        firstName,
        vendorName: row.vendorName,
        productName: row.name,
        reason,
      });
    });
  }

  return NextResponse.json({ success: true, emailSent: emailScheduled });
}
