import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  vendors,
  apps,
  vendorMembers,
  type AppStatus,
} from "@/lib/db/schema";

/**
 * Admin-side queries for the /admin/directory surface (A.4).
 *
 * IMPORTANT: these queries do NOT filter on vendors.suspended. The
 * directory exists specifically so the admin can see and act on
 * suspended vendors. The public-side filter that hides suspended
 * vendors' content lives in lib/queries/apps.ts + lib/queries/
 * search.ts only.
 */

export type AdminCompanyListItem = {
  id: number;
  slug: string;
  name: string;
  suspended: boolean;
  contactEmail: string | null;
  createdAt: Date;
  productCount: number;
  pendingSubmissionCount: number;
  memberCount: number;
};

/**
 * All vendors, newest first, with aggregated counts. Used by
 * /admin/directory list page. Three subqueries aggregate per-vendor
 * counts; for a small admin-facing list this is cheap enough at v1
 * scale.
 */
export async function listCompaniesForAdmin(): Promise<
  AdminCompanyListItem[]
> {
  // Correlated subqueries written as raw SQL strings — NO template
  // interpolation of Table objects. The prior implementation used
  // ${apps} / ${submissions} / ${vendorMembers} as FROM targets,
  // which Drizzle's sql template doesn't emit as table identifiers
  // the way db.select().from(table) does; the subqueries silently
  // collapsed and every count came back 0. Plain table + column
  // names work correctly here — Postgres resolves the correlation
  // against the outer `vendors` row.
  const rows = await db
    .select({
      id: vendors.id,
      slug: vendors.slug,
      name: vendors.name,
      suspended: vendors.suspended,
      contactEmail: vendors.contactEmail,
      createdAt: vendors.createdAt,
      productCount: sql<number>`(
        SELECT COUNT(*)::int FROM apps
        WHERE apps.vendor_id = vendors.id
      )`,
      pendingSubmissionCount: sql<number>`(
        SELECT COUNT(*)::int FROM submissions
        WHERE submissions.submitter_vendor_id = vendors.id
          AND submissions.status IN ('pending_review', 'edited_awaiting_vendor_approval')
      )`,
      memberCount: sql<number>`(
        SELECT COUNT(*)::int FROM vendor_members
        WHERE vendor_members.vendor_id = vendors.id
      )`,
    })
    .from(vendors)
    .orderBy(desc(vendors.createdAt));

  return rows;
}

export type AdminCompanyDetail = {
  vendor: {
    id: number;
    slug: string;
    name: string;
    suspended: boolean;
    contactEmail: string | null;
    websiteUrl: string | null;
    foundedYear: number | null;
    hqCountry: string | null;
    description: string | null;
    createdAt: Date;
  };
  products: Array<{
    id: number;
    slug: string;
    name: string;
    status: AppStatus;
    publishedAt: Date | null;
  }>;
  members: Array<{
    id: number;
    name: string;
    primaryEmail: string;
    role: string | null;
    isAdmin: boolean;
    onboarded: boolean;
    suspended: boolean;
  }>;
};

/**
 * Full detail for one vendor — facts panel + products + members.
 * Joins are fired in parallel. Returns null if the vendor doesn't
 * exist.
 */
export async function getCompanyDetailForAdmin(
  vendorId: number,
): Promise<AdminCompanyDetail | null> {
  const [vendorRow] = await db
    .select({
      id: vendors.id,
      slug: vendors.slug,
      name: vendors.name,
      suspended: vendors.suspended,
      contactEmail: vendors.contactEmail,
      websiteUrl: vendors.websiteUrl,
      foundedYear: vendors.foundedYear,
      hqCountry: vendors.hqCountry,
      description: vendors.description,
      createdAt: vendors.createdAt,
    })
    .from(vendors)
    .where(eq(vendors.id, vendorId))
    .limit(1);

  if (!vendorRow) return null;

  const [products, members] = await Promise.all([
    db
      .select({
        id: apps.id,
        slug: apps.slug,
        name: apps.name,
        status: apps.status,
        publishedAt: apps.publishedAt,
      })
      .from(apps)
      .where(eq(apps.vendorId, vendorId))
      .orderBy(desc(apps.createdAt)),
    db
      .select({
        id: vendorMembers.id,
        name: vendorMembers.name,
        primaryEmail: vendorMembers.primaryEmail,
        role: vendorMembers.role,
        isAdmin: vendorMembers.isAdmin,
        onboarded: vendorMembers.onboarded,
        suspended: vendorMembers.suspended,
      })
      .from(vendorMembers)
      .where(eq(vendorMembers.vendorId, vendorId))
      .orderBy(desc(vendorMembers.createdAt)),
  ]);

  return { vendor: vendorRow, products, members };
}
