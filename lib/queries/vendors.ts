import "server-only";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { vendors } from "@/lib/db/schema";

export async function getVendorBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.slug, slug), ne(vendors.suspended, true)))
    .limit(1);
  return row ?? null;
}

export async function getVendorByClerkUserId(clerkUserId: string) {
  const [row] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.clerkUserId, clerkUserId))
    .limit(1);
  return row ?? null;
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
