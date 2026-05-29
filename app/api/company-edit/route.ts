import { NextResponse, after } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { submissions, vendorMembers } from "@/lib/db/schema";
import { TERMS_VERSION } from "@/lib/legal/terms-version";
import { needsReacceptance } from "@/lib/legal/check-acceptance";
import { ensureSubmittingMemberLeadershipContact } from "@/lib/submissions/leadership-contacts";
import { notifyAdminsOfSubmission } from "@/lib/email/send-admin-notification";
import { companyEditBodySchema } from "./schema";

/**
 * POST /api/company-edit — vendor submits a company-profile edit for
 * admin review.
 *
 * Only one pending company_edit is allowed at a time; submitting while
 * one is already in pending_review returns 409 pending_exists. Rejected
 * submissions don't block a fresh one (the vendor can fix and resubmit).
 *
 * Admin review surface (approve / reject) ships in PR 2. For now the
 * submission lands in the queue and the admin sees it as type="company_edit".
 *
 * Response shape:
 *   200 { success: true }                             (honeypot)
 *   200 { success: true, submissionId: number }
 *   400 { error, fieldErrors }
 *   401 { error: "Sign in required" }
 *   403 { error: "Account suspended" }
 *   404 { error: "Vendor account not found" }
 *   409 { error, code: "version_mismatch", currentVersion }
 *   409 { error, code: "pending_exists" }
 *   500 { error }
 */
export async function POST(req: Request) {
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
      { error: "Complete onboarding before editing your company profile." },
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

  const parsed = companyEditBodySchema.safeParse(json);
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

  if (body.honeypot && body.honeypot.trim().length > 0) {
    return NextResponse.json({ success: true });
  }

  const [existing] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.submitterVendorId, member.vendorId),
        eq(submissions.type, "company_edit"),
        eq(submissions.status, "pending_review"),
      ),
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      {
        error: "A company profile edit is already under review. Please wait for it to be processed before submitting another.",
        code: "pending_exists",
      },
      { status: 409 },
    );
  }

  try {
    const { honeypot: _hp, ...payloadFields } = body;
    const leadershipContacts = ensureSubmittingMemberLeadershipContact(
      body.leadershipContacts,
      member,
    );
    if (leadershipContacts.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid input",
          fieldErrors: {
            leadershipContacts: [
              "Add your key contact before submitting",
            ],
          },
        },
        { status: 400 },
      );
    }
    const [submission] = await db
      .insert(submissions)
      .values({
        type: "company_edit",
        status: "pending_review",
        submitterVendorId: member.vendorId,
        payload: {
          ...payloadFields,
          leadershipContacts,
          termsVersionAtSubmit: TERMS_VERSION,
        },
      })
      .returning({ id: submissions.id });

    // Submission is pending_review; the vendor's dashboard +
    // /dashboard/company need to reflect the new pending state.
    revalidatePath("/dashboard", "layout");

    // Best-effort admin notification — success path only.
    after(() => notifyAdminsOfSubmission({ submissionId: submission.id }));

    return NextResponse.json({ success: true, submissionId: submission.id });
  } catch (err) {
    console.error("[company-edit] insert failed", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
