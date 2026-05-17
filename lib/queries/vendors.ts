import "server-only";
import { cache } from "react";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  vendors,
  vendorMembers,
  vendorRegions,
  regions,
  type Vendor,
  type VendorMember,
} from "@/lib/db/schema";

export async function getVendorBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.slug, slug), ne(vendors.suspended, true)))
    .limit(1);
  return row ?? null;
}

/**
 * Resolve the current Clerk user to their vendor_members row + the
 * (possibly null) vendors row it points at.
 *
 *   • new sign-in, no onboarding yet → vendorMember populated, vendor null
 *   • onboarded sign-in              → both populated
 *   • unknown clerk_user_id          → null
 *
 * One LEFT JOIN, single roundtrip.
 *
 * Wrapped in React's `cache()` so layout + page server components in
 * the same request share a single Postgres call. Without this dedupe,
 * the dashboard layout's session probe + the page's session probe
 * each fired this query independently, doubling the per-render DB
 * cost. The cache is request-scoped — concurrent users don't share
 * results.
 */
export const getVendorByMemberClerkUserId = cache(async (
  clerkUserId: string,
): Promise<{ vendor: Vendor | null; vendorMember: VendorMember } | null> => {
  const [row] = await db
    .select({
      member: vendorMembers,
      vendor: vendors,
    })
    .from(vendorMembers)
    .leftJoin(vendors, eq(vendors.id, vendorMembers.vendorId))
    .where(eq(vendorMembers.clerkUserId, clerkUserId))
    .limit(1);
  if (!row) return null;
  return { vendor: row.vendor, vendorMember: row.member };
});

export const listVendors = () =>
  db
    .select()
    .from(vendors)
    .where(ne(vendors.suspended, true))
    .orderBy(vendors.name);

export const listAllVendorSlugs = async () => {
  const rows = await db
    .select({ slug: vendors.slug })
    .from(vendors)
    .where(ne(vendors.suspended, true));
  return rows.map((r) => r.slug);
};

/**
 * Return the region slugs a vendor actively serves. Public-facing —
 * the vendor profile page uses these to render the "Regions served"
 * fact row. Slugs only; the caller maps to display names via the
 * static `lookups.region` map so no second DB call is needed.
 */
export async function getVendorRegionSlugs(
  vendorId: number,
): Promise<string[]> {
  const rows = await db
    .select({ slug: regions.slug })
    .from(vendorRegions)
    .innerJoin(regions, eq(regions.id, vendorRegions.regionId))
    .where(eq(vendorRegions.vendorId, vendorId));
  return rows.map((r) => r.slug);
}
