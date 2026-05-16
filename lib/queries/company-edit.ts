import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  submissions,
  vendors,
  vendorRegions,
  regions,
  type SubmissionStatus,
  type Vendor,
} from "@/lib/db/schema";

export type CompanyEditStatus = {
  id: number;
  status: SubmissionStatus;
  rejectionReason: string | null;
  submittedAt: Date;
  payload: Record<string, unknown> | null;
} | null;

/**
 * Return the most recent company_edit submission for a vendor, or null
 * if no such submission exists. The dashboard edit page uses this to
 * decide whether to show the form (no pending), a "under review" banner
 * (pending_review), or a rejection notice with a pre-filled edit form
 * (rejected).
 */
export async function getCompanyEditStatus(
  vendorId: number,
): Promise<CompanyEditStatus> {
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
        eq(submissions.submitterVendorId, vendorId),
        eq(submissions.type, "company_edit"),
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

export type VendorWithRegions = Vendor & { regionSlugs: string[] };

/**
 * Fetch a vendor row together with its current region slugs. Used to
 * pre-fill the company-edit form with live data.
 */
export async function getVendorWithRegions(
  vendorId: number,
): Promise<VendorWithRegions | null> {
  const [vendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, vendorId))
    .limit(1);
  if (!vendor) return null;

  const regionRows = await db
    .select({ slug: regions.slug })
    .from(vendorRegions)
    .innerJoin(regions, eq(regions.id, vendorRegions.regionId))
    .where(eq(vendorRegions.vendorId, vendorId));

  return { ...vendor, regionSlugs: regionRows.map((r) => r.slug) };
}
