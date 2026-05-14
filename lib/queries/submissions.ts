import "server-only";
import { and, desc, eq, inArray, ilike, or, sql } from "drizzle-orm";
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
  /**
   * The product name from `payload.name`. Projected at query time
   * (`payload->>'name'`) so the admin-overview page doesn't need a
   * follow-up query to pull payloads for the recent-activity list.
   * NULL when the payload is malformed or missing — caller treats
   * it as "—".
   */
  productName: string | null;
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
      productName: sql<string | null>`${submissions.payload}->>'name'`,
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
/**
 * Phase A.2 PR 2 — dashboard surface dispatch helper.
 *
 * Returns the vendor's single most-recent submission (any status,
 * any type) for the dashboard page to inspect. The page renders
 * different cards based on the status:
 *
 *   - edited_awaiting_vendor_approval → SubmissionEditedCard with diff
 *   - rejected                        → SubmissionRejectedCard
 *   - published / pending_review       → no card (existing surfaces
 *                                       already cover these states)
 *
 * Returns null when the vendor has never submitted. Multi-product
 * vendors only see the card for their LATEST submission — older
 * lifecycles aren't surfaced (admin queue / inbox is the right
 * place to chase a stuck submission deeper in history).
 */
export async function getMostRecentSubmissionForVendor(vendorId: number) {
  const [row] = await db
    .select({
      id: submissions.id,
      status: submissions.status,
      payload: submissions.payload,
      adminEdits: submissions.adminEdits,
      rejectionReason: submissions.rejectionReason,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .where(eq(submissions.submitterVendorId, vendorId))
    .orderBy(desc(submissions.submittedAt))
    .limit(1);
  return row ?? null;
}

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
        inArray(submissions.status, ["pending_review", "in_review"]),
      ),
    )
    .orderBy(desc(submissions.submittedAt));
}

/**
 * Admin-side list with filter + search. Phase A.2 — used by
 * /admin/submissions to populate the queue tabs.
 *
 * Filters:
 *   - status[] — array of statuses to include. Empty / omitted →
 *     defaults to admin's queue (pending_review + edited_awaiting).
 *   - q — case-insensitive substring match on product name (from
 *     payload.name OR admin_edits.name) or vendor name. Cheap ILIKE
 *     for now; tsvector upgrade if volume warrants.
 */
export type AdminSubmissionListItem = {
  id: number;
  status: SubmissionStatus;
  submittedAt: Date;
  reviewedAt: Date | null;
  payload: unknown;
  adminEdits: unknown;
  rejectionReason: string | null;
  vendor: {
    id: number;
    name: string;
    contactEmail: string | null;
  };
};

export async function listSubmissionsForAdmin(opts?: {
  statuses?: SubmissionStatus[];
  q?: string;
}): Promise<AdminSubmissionListItem[]> {
  const statuses =
    opts?.statuses && opts.statuses.length > 0
      ? opts.statuses
      : (["pending_review", "edited_awaiting_vendor_approval"] as const);

  const conditions = [inArray(submissions.status, statuses as SubmissionStatus[])];
  const q = opts?.q?.trim();
  if (q && q.length > 0) {
    // Match on vendor name OR the payload's "name" field. The JSONB
    // `->>` operator extracts the string value; ILIKE for case-
    // insensitive substring. The admin edits override the payload
    // name when present — match both so a search on the edited name
    // still finds the row.
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(vendors.name, pattern),
        sql`${submissions.payload}->>'name' ILIKE ${pattern}`,
        sql`${submissions.adminEdits}->>'name' ILIKE ${pattern}`,
      )!,
    );
  }

  const rows = await db
    .select({
      id: submissions.id,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      reviewedAt: submissions.reviewedAt,
      payload: submissions.payload,
      adminEdits: submissions.adminEdits,
      rejectionReason: submissions.rejectionReason,
      vendorId: vendors.id,
      vendorName: vendors.name,
      vendorContactEmail: vendors.contactEmail,
    })
    .from(submissions)
    .innerJoin(vendors, eq(vendors.id, submissions.submitterVendorId))
    .where(and(...conditions))
    .orderBy(desc(submissions.submittedAt));

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    submittedAt: r.submittedAt,
    reviewedAt: r.reviewedAt,
    payload: r.payload,
    adminEdits: r.adminEdits,
    rejectionReason: r.rejectionReason,
    vendor: {
      id: r.vendorId,
      name: r.vendorName,
      contactEmail: r.vendorContactEmail,
    },
  }));
}

/**
 * Admin-side single-submission lookup with joined vendor. Used by
 * /admin/submissions/[id]. Returns null if not found.
 */
export async function getSubmissionForAdmin(id: number) {
  const [row] = await db
    .select({
      submission: submissions,
      vendor: vendors,
    })
    .from(submissions)
    .innerJoin(vendors, eq(vendors.id, submissions.submitterVendorId))
    .where(eq(submissions.id, id))
    .limit(1);
  if (!row) return null;
  return { ...row.submission, vendor: row.vendor };
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
