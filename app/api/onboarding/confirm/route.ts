import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  vendorMembers,
  vendorMemberLegalAcceptances,
} from "@/lib/db/schema";
import { TERMS_VERSION } from "@/lib/legal/terms-version";
import { checkVendorMemberRateLimit } from "@/lib/rate-limit/vendor-member";
import { onboardingConfirmBodySchema } from "./schema";

/**
 * POST /api/onboarding/confirm — vendor accepts the live terms version
 * during the onboarding modal and is moved out of the "must onboard"
 * gate.
 *
 * Order of operations (and why):
 *
 *   1. Auth — must be a signed-in vendor; anonymous requests 401.
 *   2. Look up the vendor_member row by clerk_user_id. Missing row 404.
 *   3. Suspended members 403 (not 401 — we want to be honest with the
 *      modal so the user can sign out cleanly rather than retry).
 *   4. Already onboarded → 200 idempotent. Modal can race-call this
 *      after the user closes a stale tab and we shouldn't punish that.
 *   5. Validate body with Zod. Field errors flatten into 400 JSON so
 *      the modal can render them inline.
 *   6. Honeypot check — the modal carries a sr-only "website2" input
 *      that real users never touch. Non-empty → silent 200, no write.
 *   7. termsVersion mismatch (client cached an older modal copy) → 409
 *      so the modal can refresh and re-render the new version.
 *   8. acceptedTerms !== true → 422; this should be impossible from
 *      the modal but guards against malformed clients.
 *   9. Per-vendor_member rate limit (5/hour) — caps a misbehaving or
 *      hostile client from flapping the audit table.
 *  10. Transaction: UPDATE vendor_members SET onboarded=true; INSERT
 *      vendor_member_legal_acceptances row with version + ip + ua.
 *      Both succeed or both roll back; the audit row is the proof of
 *      consent and must be tied 1:1 to the onboarded flip.
 *
 * Response shape:
 *   200 { success: true }
 *   400 { error: "Invalid input", fieldErrors: { ... } }
 *   401 { error: "Sign in required" }
 *   403 { error: "Account suspended" }
 *   404 { error: "Vendor account not found" }
 *   409 { error: "Terms version has changed", currentVersion: "..." }
 *   422 { error: "You must accept the terms to continue" }
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

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = onboardingConfirmBodySchema.safeParse(json);
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
  if (body.website2 && body.website2.trim().length > 0) {
    return NextResponse.json({ success: true });
  }

  // Idempotency moved to a per-version check below (Phase B.2 PR 2).
  // Previously this short-circuited any "onboarded" member to 200,
  // which blocked re-acceptance after a TERMS_VERSION bump. Now we
  // INSERT an additive audit row whenever the live version isn't
  // already on file for this member; "already onboarded" alone is no
  // longer a stop signal.

  if (body.termsVersion !== TERMS_VERSION) {
    return NextResponse.json(
      {
        error: "Terms version has changed",
        currentVersion: TERMS_VERSION,
      },
      { status: 409 },
    );
  }

  if (body.acceptedTerms !== true) {
    return NextResponse.json(
      { error: "You must accept the terms to continue" },
      { status: 422 },
    );
  }

  if (!checkVendorMemberRateLimit(member.id)) {
    return NextResponse.json(
      { error: "Too many requests, please try again in an hour" },
      { status: 429 },
    );
  }

  // Per-version idempotency: if THIS exact version is already on file
  // for THIS member, no-op 200 (handles double-click / retry). Members
  // who accepted an OLDER version still fall through to the INSERT
  // below — that's how re-acceptance audit rows get written.
  const [existing] = await db
    .select({ id: vendorMemberLegalAcceptances.id })
    .from(vendorMemberLegalAcceptances)
    .where(
      and(
        eq(vendorMemberLegalAcceptances.vendorMemberId, member.id),
        eq(vendorMemberLegalAcceptances.termsVersion, TERMS_VERSION),
      ),
    )
    .limit(1);
  if (existing) {
    return NextResponse.json({ success: true });
  }

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const userAgent = req.headers.get("user-agent") || null;

  try {
    await db.transaction(async (tx) => {
      // Always set onboarded=true. For first acceptance this flips
      // false→true. For re-acceptance it's a no-op write (already
      // true). Either way the audit row insert is what carries the
      // legal weight.
      await tx
        .update(vendorMembers)
        .set({ onboarded: true, updatedAt: new Date() })
        .where(eq(vendorMembers.id, member.id));
      await tx.insert(vendorMemberLegalAcceptances).values({
        vendorMemberId: member.id,
        termsVersion: TERMS_VERSION,
        ipAddress,
        userAgent,
      });
    });
  } catch (err) {
    console.error("[onboarding/confirm] tx failed", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }

  // Dashboard layout reads onboarded state to decide whether to mount
  // the legal-acceptance modal; bust so the next render sees the new
  // onboarded=true flag.
  revalidatePath("/dashboard", "layout");

  return NextResponse.json({ success: true });
}
