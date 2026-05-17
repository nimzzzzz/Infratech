import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  submissions,
  type SubmissionStatus,
} from "@/lib/db/schema";
import { getAppById } from "@/lib/queries/apps";
import type { AppDetail } from "@/lib/queries/apps";

export type ProductEditStatus = {
  id: number;
  status: SubmissionStatus;
  rejectionReason: string | null;
  submittedAt: Date;
  payload: Record<string, unknown> | null;
} | null;

/**
 * Most recent product_edit submission for an app, or null if none
 * exists. The dashboard edit page uses this to decide whether to
 * show the editable form (no pending), an amber "under review"
 * banner (pending_review), or a rose rejection banner with a
 * pre-filled form (rejected).
 */
export async function getProductEditStatus(
  appId: number,
): Promise<ProductEditStatus> {
  const [row] = await db
    .select({
      id: submissions.id,
      status: submissions.status,
      rejectionReason: submissions.rejectionReason,
      submittedAt: submissions.submittedAt,
      payload: submissions.payload,
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.appId, appId),
        eq(submissions.type, "product_edit"),
      ),
    )
    .orderBy(desc(submissions.submittedAt))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    status: row.status,
    rejectionReason: row.rejectionReason,
    submittedAt: row.submittedAt,
    payload: row.payload as Record<string, unknown> | null,
  };
}

/**
 * Load a product for editing — same shape as getAppBySlug but keyed
 * on apps.id and not gated on status="published" so an unpublished
 * app could in principle be loaded too (currently the dashboard only
 * exposes edit links for published rows). Returns AppDetail so the
 * existing appToFormState adapter and the ProductDetailView preview
 * can consume it directly.
 *
 * Thin wrapper over getAppById so callers don't have to know about
 * the alternate-key fetch path. Ownership is verified by the page
 * (not here — keep this query reusable in admin contexts later).
 */
export async function getAppForEdit(appId: number): Promise<AppDetail | null> {
  return getAppById(appId);
}
