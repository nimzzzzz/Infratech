import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  vendorGalleryImages,
  type VendorGalleryImage,
} from "@/lib/db/schema";

/**
 * Phase C PR 2 — gallery rows for a vendor's profile page.
 * Ordered by `position` so the admin / vendor's intended order
 * is preserved. The vendor profile page calls this in parallel
 * with the existing tools query (single `Promise.all`).
 */
export async function listVendorGalleryImagesByVendorId(
  vendorId: number,
): Promise<VendorGalleryImage[]> {
  return db
    .select()
    .from(vendorGalleryImages)
    .where(eq(vendorGalleryImages.vendorId, vendorId))
    .orderBy(vendorGalleryImages.position);
}
