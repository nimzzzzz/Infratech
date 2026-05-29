import { NextResponse, after } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  apps,
  submissions,
  vendorMembers,
  vendors,
} from "@/lib/db/schema";
import { TERMS_VERSION } from "@/lib/legal/terms-version";
import { needsReacceptance } from "@/lib/legal/check-acceptance";
import { checkVendorMemberRateLimit } from "@/lib/rate-limit/vendor-member";
import { replaceVendorLeadershipContactsInTx } from "@/lib/queries/vendor-leadership";
import { ensureSubmittingMemberLeadershipContact } from "@/lib/submissions/leadership-contacts";
import { notifyAdminsOfSubmission } from "@/lib/email/send-admin-notification";
import { slugify } from "@/lib/submissions/slugify";
import { submissionBodySchema } from "./schema";

/**
 * POST /api/submissions — vendor submits a product for editorial review.
 *
 * Order of operations:
 *
 *   1. Auth — must be a signed-in vendor; anonymous → 401.
 *   2. Look up the vendor_member row by clerk_user_id. Missing → 404.
 *   3. Suspended members → 403.
 *   4. Re-acceptance gate. If the member's latest accepted version is
 *      older than the live TERMS_VERSION, return 409
 *      version_mismatch with currentVersion in the body so the modal
 *      can re-render and force re-acceptance. Defence-in-depth — the
 *      layout normally catches this earlier.
 *   5. Validate body with Zod.
 *   6. Honeypot website3 → silent 200, no writes.
 *   7. Per-vendor_member rate limit (5/hour). Same in-memory Map
 *      pattern used by /api/onboarding/confirm.
 *   8. Auto-generate vendor + app slugs from companyName / name.
 *      Server-side uniqueness check against vendors.slug and
 *      apps.slug — return 409 slug_taken on collision so the user
 *      can adjust their name.
 *   9. Transaction:
 *        - If vendor_id IS NULL: INSERT vendors, capture id, UPDATE
 *          vendor_members.vendor_id with the WHERE-IS-NULL guard so
 *          a concurrent submission can't overwrite a populated link.
 *        - INSERT submissions row, status='pending', type='new',
 *          payload = the wizard's full state.
 *      All or nothing.
 *  10. Return submissionId + vendorId + redirectUrl.
 *
 * Response shape:
 *   200 { success: true }                                       (honeypot)
 *   200 { submissionId, vendorId, redirectUrl: "/dashboard/onboarding/submitted?name=..." }
 *   400 { error: "Invalid input", fieldErrors }
 *   401 { error: "Sign in required" }
 *   403 { error: "Account suspended" }
 *   404 { error: "Vendor account not found" }
 *   409 { error, code: "version_mismatch", currentVersion }
 *   409 { error, code: "slug_taken", which: "vendor"|"app", slug }
 *   422 { error: "Company details required for first submission" }
 *   429 { error: "Too many requests, please try again in an hour" }
 *   500 { error: "Something went wrong" }
 */

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required" },
      { status: 401 },
    );
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
    return NextResponse.json(
      { error: "Account suspended" },
      { status: 403 },
    );
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

  const parsed = submissionBodySchema.safeParse(json);
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

  if (body.website3 && body.website3.trim().length > 0) {
    return NextResponse.json({ success: true });
  }

  if (!checkVendorMemberRateLimit(member.id)) {
    return NextResponse.json(
      { error: "Too many requests, please try again in an hour" },
      { status: 429 },
    );
  }

  const leadershipContacts = ensureSubmittingMemberLeadershipContact(
    body.leadershipContacts,
    member,
  );

  const mustCreateVendor = member.vendorId === null;
  if (mustCreateVendor) {
    const missing: string[] = [];
    if (!body.companyName) missing.push("companyName");
    if (!body.companyWebsite) missing.push("companyWebsite");
    if (!body.companyDescription) missing.push("companyDescription");
    if (leadershipContacts.length === 0) missing.push("leadershipContacts");
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "Company details required for first submission",
          fieldErrors: Object.fromEntries(
            missing.map((k) => [
              k,
              [
                k === "leadershipContacts"
                  ? "Add your key contact before submitting"
                  : "Required for first submission",
              ],
            ]),
          ),
        },
        { status: 422 },
      );
    }
  }

  const appSlug = slugify(body.name);
  if (!appSlug) {
    return NextResponse.json(
      {
        error: "Product name produced an empty slug; pick a name with letters or numbers.",
        fieldErrors: { name: ["Pick a name with letters or numbers"] },
      },
      { status: 400 },
    );
  }

  const [appSlugCollision] = await db
    .select({ id: apps.id })
    .from(apps)
    .where(eq(apps.slug, appSlug))
    .limit(1);
  if (appSlugCollision) {
    return NextResponse.json(
      {
        error: `The slug "${appSlug}" is already taken. Try a different product name.`,
        code: "slug_taken",
        which: "app",
        slug: appSlug,
      },
      { status: 409 },
    );
  }

  let vendorSlug: string | null = null;
  if (mustCreateVendor) {
    vendorSlug = slugify(body.companyName!);
    if (!vendorSlug) {
      return NextResponse.json(
        {
          error: "Company name produced an empty slug.",
          fieldErrors: { companyName: ["Pick a name with letters or numbers"] },
        },
        { status: 400 },
      );
    }
    const [vendorSlugCollision] = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(eq(vendors.slug, vendorSlug))
      .limit(1);
    if (vendorSlugCollision) {
      return NextResponse.json(
        {
          error: `The slug "${vendorSlug}" is already taken. Try a different company name.`,
          code: "slug_taken",
          which: "vendor",
          slug: vendorSlug,
        },
        { status: 409 },
      );
    }
  }

  try {
    const result = await db.transaction(async (tx) => {
      let vendorId = member.vendorId;

      if (mustCreateVendor) {
        const [newVendor] = await tx
          .insert(vendors)
          .values({
            slug: vendorSlug!,
            name: body.companyName!.trim(),
            contactEmail: member.primaryEmail,
            shortBlurb: null,
            description: body.companyDescription!.trim(),
            websiteUrl: body.companyWebsite!.trim(),
            foundedYear:
              body.companyFounded && /^\d{4}$/.test(body.companyFounded)
                ? Number(body.companyFounded)
                : null,
            hqCountry: body.companyHeadquarters?.trim() || null,
            claimedAt: new Date(),
          })
          .returning({ id: vendors.id });

        const linked = await tx
          .update(vendorMembers)
          .set({ vendorId: newVendor.id, updatedAt: new Date() })
          .where(
            and(
              eq(vendorMembers.id, member.id),
              isNull(vendorMembers.vendorId),
            ),
          )
          .returning({ vendorId: vendorMembers.vendorId });
        if (linked.length === 0) {
          throw new Error(
            "vendor_members.vendor_id was set concurrently — aborting",
          );
        }
        vendorId = newVendor.id;
        await replaceVendorLeadershipContactsInTx(
          tx,
          newVendor.id,
          leadershipContacts,
        );
      }

      const [submission] = await tx
        .insert(submissions)
        .values({
          type: "new",
          status: "pending_review",
          submitterVendorId: vendorId as number,
          payload: {
            slug: appSlug,
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
            appleAppStoreUrl: body.appleAppStoreUrl || null,
            googlePlayUrl: body.googlePlayUrl || null,
            termsVersionAtSubmit: TERMS_VERSION,
            // Phase C — product-level media. Always carried; the
            // publish helper writes apps.logo_url / apps.video_url
            // and app_screenshots rows from these fields.
            productLogoUrl: body.productLogoUrl || null,
            productLogoAlt: body.productLogoAlt || null,
            videoUrl: body.videoUrl || null,
            productGallery: body.productGallery ?? [],
            // Phase C — company-level media. Carried only on
            // first-time submissions (returning vendors skip step 1
            // and don't send these). publishSubmissionInTx
            // conditionally writes vendors.logo_url when present.
            ...(mustCreateVendor
              ? {
                  companyLogoUrl: body.companyLogoUrl || null,
                  companyLogoAlt: body.companyLogoAlt || null,
                  leadershipContacts,
                }
              : {}),
          },
        })
        .returning({ id: submissions.id });

      return { submissionId: submission.id, vendorId: vendorId as number };
    });

    // Belt-and-braces server-side invalidation. The wizard also calls
    // router.refresh() on success, but invalidating here closes the
    // gap if the client never executes the refresh (mid-navigation
    // race, double-click, etc.). 'layout' scope so the dashboard
    // layout's session lookup re-runs too.
    revalidatePath("/dashboard", "layout");

    // Best-effort admin notification — fire-and-forget so Resend
    // latency never blocks the response. Success path only.
    after(() =>
      notifyAdminsOfSubmission({ submissionId: result.submissionId }),
    );

    return NextResponse.json({
      submissionId: result.submissionId,
      vendorId: result.vendorId,
      redirectUrl: `/dashboard/onboarding/submitted?name=${encodeURIComponent(body.name.trim())}`,
    });
  } catch (err) {
    console.error("[submissions] tx failed", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
