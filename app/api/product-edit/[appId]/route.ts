import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { apps, submissions, vendorMembers } from "@/lib/db/schema";
import { TERMS_VERSION } from "@/lib/legal/terms-version";
import { needsReacceptance } from "@/lib/legal/check-acceptance";
import { checkVendorMemberRateLimit } from "@/lib/rate-limit/vendor-member";
import { productStepSchema } from "@/app/api/submissions/schema";

/**
 * POST /api/product-edit/:appId — vendor submits an edit to an
 * existing product for admin review.
 *
 * Mirrors the /api/company-edit pattern:
 *   - single pending edit per app (409 pending_exists otherwise)
 *   - re-acceptance gate + honeypot + rate limit
 *   - slug is locked: we read the existing apps.slug and store it in
 *     the payload, ignoring anything the client sent
 *
 * Body shape: the wizard's product-step payload (productStepSchema).
 * The wizard's submit body also carries company-* fields and the
 * website3 honeypot; Zod strips unknown keys from object schemas by
 * default, so the extra company fields are dropped silently. We
 * still check website3 explicitly because it's the honeypot signal.
 *
 * Response shape:
 *   200 { success: true }                       (honeypot)
 *   200 { success: true, submissionId }
 *   400 { error, fieldErrors }
 *   401 { error: "Sign in required" }
 *   403 { error: "Account suspended" }
 *   404 { error: "Product not found" }          (no info leak — same
 *                                                response for missing
 *                                                product OR ownership
 *                                                mismatch)
 *   409 { error, code: "version_mismatch", currentVersion }
 *   409 { error, code: "pending_exists" }
 *   429 Too many requests
 *   500 Something went wrong
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId: appIdParam } = await params;
  const appId = Number(appIdParam);
  if (!Number.isFinite(appId) || appId <= 0) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const [member] = await db
    .select()
    .from(vendorMembers)
    .where(eq(vendorMembers.clerkUserId, userId))
    .limit(1);
  if (!member) {
    return NextResponse.json(
      { error: "Vendor account not found" },
      { status: 404 },
    );
  }
  if (member.suspended) {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }
  if (!member.vendorId) {
    return NextResponse.json(
      { error: "Complete onboarding before editing products." },
      { status: 403 },
    );
  }

  const [app] = await db
    .select({
      id: apps.id,
      slug: apps.slug,
      vendorId: apps.vendorId,
    })
    .from(apps)
    .where(eq(apps.id, appId))
    .limit(1);
  // Same 404 response whether the product is missing or owned by a
  // different vendor — no information leak.
  if (!app || app.vendorId !== member.vendorId) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (await needsReacceptance(member.id)) {
    return NextResponse.json(
      {
        error: "Our terms have been updated. Please re-accept to continue.",
        code: "version_mismatch",
        currentVersion: TERMS_VERSION,
      },
      { status: 409 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // The wizard's body carries company-* fields too; productStepSchema
  // strips unknown keys, so only product fields survive validation.
  const parsed = productStepSchema.safeParse(json);
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

  // Honeypot — wizard sends website3 alongside the product fields.
  const honeypot = (json as { website3?: unknown }).website3;
  if (typeof honeypot === "string" && honeypot.trim().length > 0) {
    return NextResponse.json({ success: true });
  }

  if (!checkVendorMemberRateLimit(member.id)) {
    return NextResponse.json(
      { error: "Too many requests, please try again in an hour" },
      { status: 429 },
    );
  }

  // Single pending product_edit per app — same rule as company_edit.
  // Rejected rows don't block; vendor can fix and resubmit.
  const [existing] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.appId, app.id),
        eq(submissions.type, "product_edit"),
        eq(submissions.status, "pending_review"),
      ),
    )
    .limit(1);
  if (existing) {
    return NextResponse.json(
      {
        error:
          "An edit to this product is already under review. Please wait for it to be processed before submitting another.",
        code: "pending_exists",
      },
      { status: 409 },
    );
  }

  try {
    const [submission] = await db
      .insert(submissions)
      .values({
        type: "product_edit",
        status: "pending_review",
        submitterVendorId: member.vendorId,
        appId: app.id,
        payload: {
          // Slug is LOCKED — always the existing apps.slug, never
          // anything the client might have sent. publishSubmissionInTx
          // (PR 2's admin-approve path) requires slug to be present;
          // pinning it here keeps that contract happy.
          slug: app.slug,
          name: body.name.trim(),
          url: body.url.trim(),
          tagline: body.tagline.trim(),
          description: body.description.trim(),
          stages: body.stages,
          capabilities: body.capabilities,
          industries: body.industries,
          pricingModels: body.pricingModels,
          customCapabilities: body.customCapabilities ?? [],
          customIndustries: body.customIndustries ?? [],
          customPricing: body.customPricing ?? null,
          productLogoUrl: body.productLogoUrl || null,
          productLogoAlt: body.productLogoAlt || null,
          videoUrl: body.videoUrl || null,
          productGallery: body.productGallery ?? [],
          termsVersionAtSubmit: TERMS_VERSION,
        },
      })
      .returning({ id: submissions.id });

    return NextResponse.json({ success: true, submissionId: submission.id });
  } catch (err) {
    console.error("[product-edit] insert failed", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
