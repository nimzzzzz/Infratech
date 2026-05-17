import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { vendors, vendorRegions, regions } from "@/lib/db/schema";

type Tx = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

export type CompanyEditPayload = {
  companyName: string;
  companyWebsite: string;
  companyFounded?: string;
  companyHeadquarters?: string;
  companyRegions?: string[];
  companyDescription?: string;
  companyLogoUrl?: string | null;
};

/**
 * Apply an approved company-edit payload to the vendors row.
 * Idempotent: UPDATE vendors + wipe + reinsert vendor_regions.
 *
 * The "global" region slug is UI-only (not stored in vendor_regions);
 * any other slug is resolved to a region.id via a SELECT before insert.
 *
 * Runs inside the caller's transaction so it participates in the same
 * atomicity boundary as the submissions status update.
 */
export async function publishCompanyEditInTx(
  tx: Tx,
  vendorId: number,
  payload: CompanyEditPayload,
): Promise<void> {
  await tx
    .update(vendors)
    .set({
      name: payload.companyName,
      websiteUrl: payload.companyWebsite,
      foundedYear:
        payload.companyFounded && /^\d{4}$/.test(payload.companyFounded)
          ? Number(payload.companyFounded)
          : null,
      hqCountry: payload.companyHeadquarters ?? null,
      description: payload.companyDescription ?? null,
      ...(payload.companyLogoUrl !== undefined
        ? { logoUrl: payload.companyLogoUrl || null }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(vendors.id, vendorId));

  // Wipe existing region joins then reinsert from slugs.
  await tx.delete(vendorRegions).where(eq(vendorRegions.vendorId, vendorId));

  const regionSlugs = (payload.companyRegions ?? []).filter(
    (s) => s !== "global",
  );
  if (regionSlugs.length > 0) {
    const regionRows = await tx
      .select({ id: regions.id })
      .from(regions)
      .where(inArray(regions.slug, regionSlugs));
    if (regionRows.length > 0) {
      await tx
        .insert(vendorRegions)
        .values(regionRows.map((r) => ({ vendorId, regionId: r.id })));
    }
  }
}
