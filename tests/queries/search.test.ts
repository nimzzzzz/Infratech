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

describe("searchApps — sort + pagination interaction", () => {
  it("relevance-sorts results when q is present", async () => {
    const { results } = await searchApps({ q: "ora" });
    // Both Aconex and Primavera P6 should be present; Oracle is a
    // weight-B vendor match in both, so ts_rank ties → secondary sort
    // by name (ascending). Aconex sorts before Primavera P6.
    expect(results[0].slug).toBe("aconex");
  });

  it("respects pageSize", async () => {
    const { results, total, totalPages } = await searchApps({ pageSize: 5 });
    expect(results.length).toBeLessThanOrEqual(5);
    expect(total).toBeGreaterThanOrEqual(15);
    expect(totalPages).toBeGreaterThanOrEqual(3);
  });
});
