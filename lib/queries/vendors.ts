import "server-only";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { vendors, vendorMembers, type Vendor, type VendorMember } from "@/lib/db/schema";

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
 */
export async function getVendorByMemberClerkUserId(
  clerkUserId: string,
): Promise<{ vendor: Vendor | null; vendorMember: VendorMember } | null> {
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
}

/**
 * @deprecated Use getVendorByMemberClerkUserId. Kept as a thin
 * compatibility shim while callers migrate; removed in the
 * column-drop commit. Returns the joined vendor row (or null) so
 * existing callers that just needed "the company for this user"
 * keep working.
 */
export async function getVendorByClerkUserId(
  clerkUserId: string,
): Promise<Vendor | null> {
  const result = await getVendorByMemberClerkUserId(clerkUserId);
  return result?.vendor ?? null;
}

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
