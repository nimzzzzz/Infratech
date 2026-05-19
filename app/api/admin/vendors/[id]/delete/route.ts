import { NextResponse, after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { vendors, apps, vendorMembers } from "@/lib/db/schema";
import { recordAdminAudit } from "@/lib/admin/audit";
import { sendVendorDeletedEmail } from "@/lib/email/send-vendor-moderation";
import { getCompanyDeletionImpact } from "@/lib/queries/directory";

const bodySchema = z.object({
  /** Case-sensitive (after trim) equality check against vendor.name.
   *  The client also disables the submit button until this matches —
   *  this is defence in depth for direct API calls. */
  confirmationName: z.string().min(1).max(500),
  reason: z.string().trim().max(1000).optional(),
  /** When true, also suspends every vendor_member for this vendor
   *  BEFORE the deletes — so when the members are orphaned (vendor_id
   *  SET NULL via cascade), they're stuck and can't re-onboard. */
  blockMembers: z.boolean(),
});

/**
 * POST /api/admin/vendors/[id]/delete — permanent, irreversible.
 *
 * The cascade is genuinely two top-level DELETEs:
 *   1. DELETE FROM apps WHERE vendor_id = X
 *      → cascades through app_screenshots / app_stages /
 *        app_capabilities / app_industries / app_pricing_models /
 *        app_views / outbound_clicks / contact_messages (per-app)
 *        and SETs submissions.app_id NULL
 *   2. DELETE FROM vendors WHERE id = X
 *      → cascades through submissions (per-vendor),
 *        contact_messages (per-vendor — already gone via #1's
 *        cascade since contact_messages.app_id is NOT NULL),
 *        vendor_regions, and SETs vendor_members.vendor_id NULL
 *
 * apps.vendor_id has onDelete: RESTRICT — the ONLY blocker, which
 * is why step 1 runs first. Postgres handles every other dependent
 * row via FK declarations.
 *
 * Members are intentionally orphaned (vendor_id NULL), NOT deleted —
 * preserves their legal-acceptance audit trail and audit_log entries.
 * If blockMembers is true, we suspend the members BEFORE the deletes
 * (matched by vendor_id, which is about to become NULL).
 *
 * Response shape:
 *   200 { success, emailSent }
 *   400 invalid id / invalid body / name_mismatch / self_block
 *   401 Sign in required
 *   403 Admin only / Account suspended
 *   404 Vendor not found
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

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Load the full deletion impact — used for the audit before-block
  // AND for the typed-name validation (gives us the canonical name).
  const impact = await getCompanyDeletionImpact(vendorId);
  if (!impact) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  // Trim whitespace then case-sensitive equality. Pasting the name
  // with trailing whitespace shouldn't fail; internal whitespace
  // is compared as-is.
  if (body.confirmationName.trim() !== impact.vendor.name) {
    return NextResponse.json(
      {
        error: "Confirmation name does not match the vendor's name.",
        code: "name_mismatch",
      },
      { status: 400 },
    );
  }

  // Defensive: if the admin is themselves a member of the vendor
  // being deleted AND blockMembers is true, refuse — would suspend
  // their own account mid-delete and leave them locked out.
  if (body.blockMembers && actor.vendorId === impact.vendor.id) {
    return NextResponse.json(
      {
        error:
          "You're a member of this company. Uncheck 'block members from re-onboarding' to delete it, or have a different admin run the delete.",
        code: "self_block",
      },
      { status: 400 },
    );
  }

  // Capture name + email for the post-commit email send. After the
  // transaction commits, the vendor row is gone; these values must
  // already be in closure scope when after() fires.
  const capturedVendorName = impact.vendor.name;
  const capturedContactEmail = impact.vendor.contactEmail;
  const capturedReason =
    body.reason && body.reason.length > 0 ? body.reason : undefined;

  try {
    await db.transaction(async (tx) => {
      // blockMembers FIRST — once vendors is deleted, vendor_members.
      // vendor_id becomes NULL via the SET NULL cascade and the
      // WHERE clause would match zero rows.
      if (body.blockMembers) {
        await tx
          .update(vendorMembers)
          .set({ suspended: true, updatedAt: new Date() })
          .where(eq(vendorMembers.vendorId, impact.vendor.id));
      }

      // 1. Delete apps — cascades through every per-app FK
      //    (app_screenshots / app_stages / app_capabilities /
      //    app_industries / app_pricing_models / app_views /
      //    outbound_clicks / contact_messages); SETs submissions
      //    .app_id NULL for any submissions that pointed at these
      //    apps.
      await tx.delete(apps).where(eq(apps.vendorId, impact.vendor.id));

      // 2. Delete vendor — cascades through per-vendor FKs
      //    (submissions / vendor_regions); SETs vendor_members
      //    .vendor_id NULL. contact_messages were already gone via
      //    step 1's per-app cascade.
      await tx.delete(vendors).where(eq(vendors.id, impact.vendor.id));

      // 3. Audit log — capture EVERYTHING about the deleted entity.
      //    This is the only surviving record; completeness matters.
      await recordAdminAudit(tx, {
        actorVendorMemberId: actor.id,
        action: "vendor.delete",
        targetType: "vendor",
        targetId: impact.vendor.id,
        before: {
          ...impact.vendor,
          createdAt: impact.vendor.createdAt.toISOString(),
          productCount: impact.productCount,
          productNames: impact.productNames,
          submissionCount: impact.submissionCount,
          inquiryCount: impact.inquiryCount,
          memberCount: impact.members.length,
          memberEmails: impact.members.map((m) => ({
            name: m.name,
            primaryEmail: m.primaryEmail,
            isAdmin: m.isAdmin,
          })),
          reason: capturedReason ?? null,
          blockMembers: body.blockMembers,
        },
        after: null,
      });
    });
  } catch (err) {
    console.error("[admin.vendor.delete] tx failed", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Broad cache invalidation — public surfaces (home, search, every
  // stage/capability/industry page, every product detail page, the
  // vendor profile) all served stale otherwise.
  revalidatePath("/", "layout");

  // Email after commit. Gated on contactEmail presence.
  let emailScheduled = false;
  if (capturedContactEmail) {
    emailScheduled = true;
    const firstName = capturedVendorName.split(" ")[0] ?? "there";
    after(async () => {
      await sendVendorDeletedEmail({
        to: capturedContactEmail,
        firstName,
        vendorName: capturedVendorName,
        reason: capturedReason,
      });
    });
  }

  return NextResponse.json({ success: true, emailSent: emailScheduled });
}
