import "server-only";
import { and, desc, eq } from "drizzle-orm";
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
