import { describe, it, expect } from "vitest";
import { searchApps } from "@/lib/queries/search";

/**
 * Search scope is name + vendor_name only (not tagline / description /
 * tag names). This matches the product spec: filter sidebar covers
 * capability / stage / industry; search covers literal name lookups.
 */

describe("searchApps — scope", () => {
  it("matches by app name (full word)", async () => {
    const { results } = await searchApps({ q: "aconex" });
    expect(results.map((r) => r.slug)).toContain("aconex");
  });

  it("matches by app name (prefix — first 2 chars)", async () => {
    const { results } = await searchApps({ q: "ac" });
    expect(results.map((r) => r.slug)).toContain("aconex");
  });

  it("matches all apps from a vendor when vendor name is queried", async () => {
    const { results } = await searchApps({ q: "oracle" });
    const slugs = results.map((r) => r.slug);
    expect(slugs).toContain("aconex");
    expect(slugs).toContain("primavera-p6");
    // Every result must be from Oracle.
    for (const r of results) expect(r.vendor.name).toBe("Oracle");
  });

  it("matches by vendor name prefix", async () => {
    const { results } = await searchApps({ q: "ora" });
    const slugs = results.map((r) => r.slug);
    expect(slugs).toContain("aconex");
    expect(slugs).toContain("primavera-p6");
  });

  it("returns zero for words that appear ONLY in tagline/description", async () => {
    // 'scheduling' appears in the ALICE Technologies tagline but no app
    // or vendor is literally named that. Narrow-scope search excludes it.
    const { results } = await searchApps({ q: "scheduling" });
    expect(results).toHaveLength(0);
  });

  it("returns zero for capability names that don't appear in any app/vendor name", async () => {
    const { results: cons } = await searchApps({ q: "construction" });
    expect(cons).toHaveLength(0);
  });

  it("treats sub-2-char input as no-search (returns full result set)", async () => {
    const { results } = await searchApps({ q: "a" });
    // 15 published apps in seed
    expect(results.length).toBeGreaterThanOrEqual(15);
  });

  it("treats stripped-empty input (special chars only) as no-search", async () => {
    const { results } = await searchApps({ q: "&|()" });
    expect(results.length).toBeGreaterThanOrEqual(15);
  });

  it("empty query returns the unfiltered set", async () => {
    const { results } = await searchApps({ q: "" });
    expect(results.length).toBeGreaterThanOrEqual(15);
  });
});

describe("searchApps — pagination", () => {
  it("orders search hits alphabetically (sort tabs were retired)", async () => {
    const { results } = await searchApps({ q: "ora" });
    // Both Aconex and Primavera P6 are vendor-match hits for "ora";
    // alphabetical = Aconex first.
    expect(results[0].slug).toBe("aconex");
  });

  it("respects pageSize", async () => {
    const { results, total, totalPages } = await searchApps({ pageSize: 5 });
    expect(results.length).toBeLessThanOrEqual(5);
    expect(total).toBeGreaterThanOrEqual(15);
    expect(totalPages).toBeGreaterThanOrEqual(3);
  });
});

describe("searchApps — filters", () => {
  it("empty filters returns every published app, paginated", async () => {
    const { results, total } = await searchApps({});
    expect(total).toBe(15);
    // Default page size is 24, so all 15 fit on one page.
    expect(results.length).toBe(15);
  });

  it("filters by stage (single)", async () => {
    const { results } = await searchApps({ stage: ["operations"] });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.stages.map((s) => s.slug)).toContain("operations");
    }
  });

  it("filters by capability (single)", async () => {
    const { results } = await searchApps({ capability: ["scheduling"] });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.capabilitySlugs).toContain("scheduling");
    }
  });

  it("OR within a category — stage=[delivery, operations] returns the union", async () => {
    const { total: deliveryTotal } = await searchApps({ stage: ["delivery"] });
    const { total: opsTotal } = await searchApps({ stage: ["operations"] });
    const { results, total } = await searchApps({
      stage: ["delivery", "operations"],
    });
    // Union must be at least as large as either side and at most their sum.
    expect(total).toBeGreaterThanOrEqual(Math.max(deliveryTotal, opsTotal));
    expect(total).toBeLessThanOrEqual(deliveryTotal + opsTotal);
    for (const r of results) {
      const slugs = r.stages.map((s) => s.slug);
      expect(
        slugs.includes("delivery") || slugs.includes("operations"),
      ).toBe(true);
    }
  });

  it("AND across categories — stage=delivery AND capability=scheduling narrows further", async () => {
    const { total: stageOnly } = await searchApps({ stage: ["delivery"] });
    const { results, total } = await searchApps({
      stage: ["delivery"],
      capability: ["scheduling"],
    });
    expect(total).toBeLessThanOrEqual(stageOnly);
    for (const r of results) {
      expect(r.stages.map((s) => s.slug)).toContain("delivery");
      expect(r.capabilitySlugs).toContain("scheduling");
    }
  });

  it("all four filter categories together don't error (smoke)", async () => {
    const { results, total, page, pageSize, totalPages } = await searchApps({
      stage: ["delivery"],
      capability: ["scheduling"],
      industry: ["construction"],
      pricing: ["user-subscription-freemium"],
    });
    expect(Array.isArray(results)).toBe(true);
    expect(typeof total).toBe("number");
    expect(typeof page).toBe("number");
    expect(typeof pageSize).toBe("number");
    expect(typeof totalPages).toBe("number");
  });

  it("q + filters compose (q AND filter predicates)", async () => {
    const { results } = await searchApps({
      q: "ora",
      capability: ["document-control"],
    });
    // Aconex matches both q=ora (via Oracle vendor) and capability=document-control
    expect(results.map((r) => r.slug)).toContain("aconex");
    for (const r of results) {
      expect(r.capabilitySlugs).toContain("document-control");
    }
  });
});

describe("searchApps — pagination edges", () => {
  it("page=1, pageSize=5 returns the first 5", async () => {
    const { results, page, pageSize, total, totalPages } = await searchApps({
      page: 1,
      pageSize: 5,
    });
    expect(page).toBe(1);
    expect(pageSize).toBe(5);
    expect(results.length).toBe(5);
    expect(total).toBe(15);
    expect(totalPages).toBe(3);
  });

  it("page=2, pageSize=5 returns the next 5 (no overlap with page 1)", async () => {
    const p1 = await searchApps({ page: 1, pageSize: 5 });
    const p2 = await searchApps({ page: 2, pageSize: 5 });
    expect(p2.results.length).toBe(5);
    const p1Ids = new Set(p1.results.map((r) => r.id));
    for (const r of p2.results) expect(p1Ids.has(r.id)).toBe(false);
  });

  it("page beyond range returns an empty results array but preserves total", async () => {
    const { results, total, totalPages } = await searchApps({
      page: 999,
      pageSize: 5,
    });
    expect(results).toEqual([]);
    expect(total).toBe(15);
    expect(totalPages).toBe(3);
  });

  it("clamps page to >= 1 when given 0 or negative", async () => {
    const { page } = await searchApps({ page: 0, pageSize: 5 });
    expect(page).toBe(1);
  });

  it("clamps pageSize to a sane upper bound", async () => {
    const { pageSize } = await searchApps({ pageSize: 99999 });
    expect(pageSize).toBeLessThanOrEqual(100);
  });
});

describe("searchApps — ordering", () => {
  it("always returns results alphabetically by name", async () => {
    const { results } = await searchApps({});
    const names = results.map((r) => r.name);
    // Postgres default collation is byte-order (lowercase after uppercase),
    // matching JS default Array.sort — not localeCompare which puts 'n'
    // among the alphabetical N's. Compare in PG's order, not natural order.
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it("alphabetical even when filters narrow the set", async () => {
    const { results } = await searchApps({ stage: ["delivery"] });
    const names = results.map((r) => r.name);
    expect(names).toEqual([...names].sort());
  });
});

describe("searchApps — result shape", () => {
  it("returns the documented top-level keys", async () => {
    const r = await searchApps({});
    expect(r).toHaveProperty("results");
    expect(r).toHaveProperty("total");
    expect(r).toHaveProperty("page");
    expect(r).toHaveProperty("pageSize");
    expect(r).toHaveProperty("totalPages");
    expect(Array.isArray(r.results)).toBe(true);
  });

  it("each AppCard carries the documented keys", async () => {
    const { results } = await searchApps({ pageSize: 1 });
    expect(results.length).toBeGreaterThan(0);
    const a = results[0];
    expect(a).toHaveProperty("id");
    expect(a).toHaveProperty("slug");
    expect(a).toHaveProperty("name");
    expect(a).toHaveProperty("tagline");
    expect(a).toHaveProperty("vendor");
    expect(a.vendor).toHaveProperty("slug");
    expect(a.vendor).toHaveProperty("name");
    expect(Array.isArray(a.stages)).toBe(true);
    expect(Array.isArray(a.capabilitySlugs)).toBe(true);
    expect(Array.isArray(a.industrySlugs)).toBe(true);
  });
});
