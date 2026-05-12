import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  submissions,
  vendorMembers,
  vendors,
  type Submission,
  type VendorMember,
  type Vendor,
} from "@/lib/db/schema";

/**
 * Vendor-side counterpart to admin-review.ts:loadAdminActionContext.
 * Resolves the Clerk session, looks up the vendor_members row, and
 * verifies ownership of the target submission:
 *
 *   actor.vendor_id === submission.submitter_vendor_id
 *
 * Returns the actor + submission + vendor on success, or a
 * NextResponse to short-circuit the route on any failure. Mirrors
 * the loadAdminActionContext shape so endpoint code reads
 * identically on both sides.
 *
 * 403 on mismatch (NOT 404) — the submission exists but the caller
 * has no claim to it. Returning 404 here would leak existence,
 * 403 is the honest answer.
 */
export type VendorActionContext = {
  actor: VendorMember;
  submission: Submission;
  vendor: Vendor;
};

export async function loadVendorActionContext(
  submissionId: number,
): Promise<VendorActionContext | NextResponse> {
  if (!Number.isFinite(submissionId) || submissionId <= 0) {
    return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
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
  if (actor.suspended) {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }
  if (actor.vendorId === null) {
    // A vendor_members row without a vendor link can't own a
    // submission. This is the pre-wizard state — they have nothing
    // to act on.
    return NextResponse.json(
      { error: "Complete your company profile first" },
      { status: 403 },
    );
  }

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submission.submitterVendorId !== actor.vendorId) {
    // Ownership mismatch — 403, not 404. The submission exists but
    // the caller has no claim. Hiding existence behind 404 isn't
    // worth it; vendor IDs aren't sensitive.
    return NextResponse.json({ error: "Not your submission" }, { status: 403 });
  }

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, submission.submitterVendorId))
    .limit(1);
  if (!vendor) {
    return NextResponse.json(
      { error: "Vendor record missing" },
      { status: 500 },
    );
  }

  return { actor, submission, vendor };
}
