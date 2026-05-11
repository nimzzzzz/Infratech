import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  submissions,
  suggestions,
  vendors,
  type SubmissionStatus,
  type SuggestionStatus,
} from "@/lib/db/schema";

export type SubmissionListItem = {
  id: number;
  type: "new" | "claim";
  status: SubmissionStatus;
  submittedAt: Date;
  submitterName: string | null;
  submitterEmail: string | null;
};

export async function listSubmissions(opts?: {
  status?: SubmissionStatus;
}): Promise<SubmissionListItem[]> {
  const conditions = opts?.status ? [eq(submissions.status, opts.status)] : [];

  const rows = await db
    .select({
      id: submissions.id,
      type: submissions.type,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      submitterName: vendors.name,
      submitterEmail: vendors.contactEmail,
    })
    .from(submissions)
    .innerJoin(vendors, eq(vendors.id, submissions.submitterVendorId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(submissions.submittedAt));

  return rows;
}

/**
 * Submissions in the queue (pending or in_review) for a single vendor.
 * Dashboard reads this to render the "Your submission is under review"
 * state when the vendor has no published apps yet.
 *
 * Filters out terminal states (approved / rejected / changes_requested)
 * because those don't represent "in flight" work.
 */
export async function listPendingSubmissionsForVendor(vendorId: number) {
  return db
    .select({
      id: submissions.id,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      payload: submissions.payload,
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.submitterVendorId, vendorId),
        inArray(submissions.status, ["pending", "in_review"]),
      ),
    )
    .orderBy(desc(submissions.submittedAt));
}

export async function getSubmissionById(id: number) {
  const [row] = await db
    .select({
      submission: submissions,
      submitter: {
        id: vendors.id,
        slug: vendors.slug,
        name: vendors.name,
        contactEmail: vendors.contactEmail,
        linkedinUrl: vendors.linkedinUrl,
      },
    })
    .from(submissions)
    .innerJoin(vendors, eq(vendors.id, submissions.submitterVendorId))
    .where(eq(submissions.id, id))
    .limit(1);
  if (!row) return null;
  return { ...row.submission, submitter: row.submitter };
}

export async function listSuggestions(opts?: { status?: SuggestionStatus }) {
  const conditions = opts?.status ? [eq(suggestions.status, opts.status)] : [];
  return db
    .select()
    .from(suggestions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(suggestions.createdAt));
}
