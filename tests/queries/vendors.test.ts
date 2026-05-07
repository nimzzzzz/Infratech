import { describe, it, expect } from "vitest";
import {
  getVendorBySlug,
  getVendorByMemberClerkUserId,
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

  it("getVendorByMemberClerkUserId returns null when clerk_user_id not seeded", async () => {
    // Seed vendors don't have any vendor_members rows; the demo
    // admin is in admins, separate table.
    const r = await getVendorByMemberClerkUserId("user_does_not_exist");
    expect(r).toBeNull();
  });

  it("getVendorByMemberClerkUserId joins the vendor_member to its vendor when both exist", async () => {
    // Insert a vendor + a vendor_members row pointing at it.
    await db.execute(sql`
      INSERT INTO vendors (slug, name, contact_email)
      VALUES ('clerktest-vendor', 'Clerktest Vendor', 'x@example.com')
    `);
    await db.execute(sql`
      INSERT INTO vendor_members
        (vendor_id, clerk_user_id, name, primary_email, onboarded)
      VALUES
        ((SELECT id FROM vendors WHERE slug = 'clerktest-vendor'),
         'user_test_lookup', 'Clerk Test User', 'x@example.com', true)
    `);
    const r = await getVendorByMemberClerkUserId("user_test_lookup");
    expect(r?.vendor?.name).toBe("Clerktest Vendor");
    expect(r?.vendorMember.name).toBe("Clerk Test User");
    expect(r?.vendorMember.onboarded).toBe(true);
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
