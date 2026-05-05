import { describe, it, expect } from "vitest";
import {
  getVendorBySlug,
  getVendorByClerkUserId,
  listVendors,
  listAllVendorSlugs,
} from "@/lib/queries/vendors";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

describe("vendor queries", () => {
  it("getVendorBySlug returns Oracle by slug", async () => {
    const v = await getVendorBySlug("oracle");
    expect(v?.name).toBe("Oracle");
    expect(v?.foundedYear).toBe(1977);
  });

  it("getVendorBySlug returns null for unknown slug", async () => {
    const v = await getVendorBySlug("not-a-real-vendor");
    expect(v).toBeNull();
  });

  it("getVendorBySlug excludes suspended vendors", async () => {
    // Suspend Oracle in this tx — it should disappear from public reads
    await db.execute(
      sql`UPDATE vendors SET suspended = true WHERE slug = 'oracle'`,
    );
    const v = await getVendorBySlug("oracle");
    expect(v).toBeNull();
  });

  it("getVendorByClerkUserId returns null when clerk_user_id not seeded", async () => {
    // Seed vendors don't have clerk_user_id set; the demo admin does, but
    // they're in admins, not vendors.
    const v = await getVendorByClerkUserId("user_does_not_exist");
    expect(v).toBeNull();
  });

  it("getVendorByClerkUserId finds a vendor we just inserted with one", async () => {
    await db.execute(sql`
      INSERT INTO vendors (slug, name, contact_email, clerk_user_id, onboarded)
      VALUES ('clerktest-vendor', 'Clerktest Vendor', 'x@example.com', 'user_test_lookup', false)
    `);
    const v = await getVendorByClerkUserId("user_test_lookup");
    expect(v?.name).toBe("Clerktest Vendor");
  });

  it("listVendors returns all 14 seeded public vendors", async () => {
    const all = await listVendors();
    expect(all.length).toBeGreaterThanOrEqual(14);
    const slugs = all.map((v) => v.slug);
    expect(slugs).toContain("oracle");
  });

  it("listAllVendorSlugs returns just slugs", async () => {
    const slugs = await listAllVendorSlugs();
    expect(slugs).toContain("oracle");
    expect(slugs).toContain("procore-technologies");
  });
});
