import { describe, it, expect } from "vitest";
import {
  getAppBySlug,
  listApps,
  listAppsByStage,
  listAppsByCapability,
  listAppsByIndustry,
  listAppsByVendorSlug,
  listAllAppSlugs,
  getFeaturedApps,
  listRecentlyAddedApps,
  listRelatedApps,
  listAppsForOwnerVendor,
} from "@/lib/queries/apps";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

describe("app queries", () => {
  it("getAppBySlug returns Aconex with vendor + tag relations", async () => {
    const app = await getAppBySlug("aconex");
    expect(app).not.toBeNull();
    expect(app?.name).toBe("Aconex");
    expect(app?.vendor.slug).toBe("oracle");
    expect(app?.stages.length).toBeGreaterThan(0);
    expect(app?.capabilities.length).toBeGreaterThan(0);
  });

  it("getAppBySlug returns null for unknown slug", async () => {
    const app = await getAppBySlug("not-a-real-app");
    expect(app).toBeNull();
  });

  it("listApps returns published apps as AppCard", async () => {
    const apps = await listApps({ status: "published" });
    expect(apps.length).toBe(15);
    const aconex = apps.find((a) => a.slug === "aconex");
    expect(aconex?.vendor.name).toBe("Oracle");
    expect(Array.isArray(aconex?.capabilitySlugs)).toBe(true);
  });

  it("listApps respects featured filter", async () => {
    const featured = await listApps({ featured: true });
    for (const a of featured) expect(a.featured).toBe(true);
  });

  it("listAppsByStage filters by stage slug", async () => {
    const apps = await listAppsByStage("delivery");
    expect(apps.length).toBeGreaterThan(0);
    for (const a of apps) {
      expect(a.stages.map((s) => s.slug)).toContain("delivery");
    }
  });

  it("listAppsByStage returns empty for unknown stage slug", async () => {
    const apps = await listAppsByStage("not-a-stage");
    expect(apps).toEqual([]);
  });

  it("listAppsByCapability filters by capability", async () => {
    const apps = await listAppsByCapability("scheduling");
    expect(apps.length).toBeGreaterThan(0);
    for (const a of apps) {
      expect(a.capabilitySlugs).toContain("scheduling");
    }
  });

  it("listAppsByIndustry filters by industry", async () => {
    const apps = await listAppsByIndustry("construction");
    for (const a of apps) {
      expect(a.industrySlugs).toContain("construction");
    }
  });

  it("listAppsByVendorSlug returns Oracle's apps", async () => {
    const apps = await listAppsByVendorSlug("oracle");
    expect(apps.length).toBeGreaterThan(0);
    for (const a of apps) expect(a.vendor.slug).toBe("oracle");
  });

  it("listAppsByVendorSlug returns empty for unknown vendor", async () => {
    const apps = await listAppsByVendorSlug("not-a-vendor");
    expect(apps).toEqual([]);
  });

  it("listAllAppSlugs returns all 15 published slugs", async () => {
    const slugs = await listAllAppSlugs();
    expect(slugs.length).toBe(15);
    expect(slugs).toContain("aconex");
  });

  it("getFeaturedApps respects limit", async () => {
    const apps = await getFeaturedApps(2);
    expect(apps.length).toBeLessThanOrEqual(2);
  });

  it("listRecentlyAddedApps returns up to N apps ordered by publishedAt desc", async () => {
    const apps = await listRecentlyAddedApps(5);
    expect(apps.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < apps.length; i++) {
      const a = apps[i - 1].publishedAt?.getTime() ?? 0;
      const b = apps[i].publishedAt?.getTime() ?? 0;
      expect(a).toBeGreaterThanOrEqual(b);
    }
  });

  it("listRelatedApps excludes the source app", async () => {
    const aconex = await getAppBySlug("aconex");
    if (!aconex) throw new Error("aconex must be seeded");
    const related = await listRelatedApps(aconex.id, 4);
    for (const r of related) expect(r.id).not.toBe(aconex.id);
  });

  it("listAppsForOwnerVendor returns ALL of a vendor's apps regardless of status", async () => {
    const oracle = await db.execute<{ id: number }>(
      sql`SELECT id FROM vendors WHERE slug = 'oracle'`,
    );
    const vendorId = oracle[0]?.id;
    if (!vendorId) throw new Error("oracle must be seeded");
    // Insert a draft app to confirm it shows up alongside published
    await db.execute(sql`
      INSERT INTO apps (slug, vendor_id, name, website_url, status)
      VALUES ('oracle-draft-x', ${vendorId}, 'Oracle Draft X', 'https://example.com', 'draft')
    `);
    const apps = await listAppsForOwnerVendor(vendorId);
    const slugs = apps.map((a) => a.slug);
    expect(slugs).toContain("oracle-draft-x");
    expect(slugs).toContain("aconex");
  });
});
