import { describe, it, expect } from "vitest";
import { getFilterFacets } from "@/lib/queries/facets";
import {
  capabilities as capList,
  pricingModels as pricingList,
  industries as industryList,
} from "@/lib/data/taxonomy";
import { stages as stageList } from "@/lib/data/stages";

/**
 * Facets answer "if I add this option, how many results would I see?".
 * Each category's counts are computed against the OTHER active filters,
 * so adding/removing a stage changes capability counts but not the stage
 * counts themselves.
 *
 * Every option must appear in the result map (zero counts included) so
 * the sidebar can render greyed-out options instead of hiding them.
 */

describe("getFilterFacets — no filters", () => {
  it("returns counts for every option in every category", async () => {
    const f = await getFilterFacets({});
    for (const s of stageList) expect(f.stage).toHaveProperty(s.slug);
    for (const c of capList) expect(f.capability).toHaveProperty(c.slug);
    for (const p of pricingList) expect(f.pricing).toHaveProperty(p.slug);
    for (const i of industryList) expect(f.industry).toHaveProperty(i.slug);
  });

  it("counts are non-negative integers", async () => {
    const f = await getFilterFacets({});
    for (const v of Object.values(f.stage)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
    for (const v of Object.values(f.capability)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it("at least one option per category has a positive count (seed sanity)", async () => {
    const f = await getFilterFacets({});
    expect(Object.values(f.stage).some((n) => n > 0)).toBe(true);
    expect(Object.values(f.capability).some((n) => n > 0)).toBe(true);
    expect(Object.values(f.pricing).some((n) => n > 0)).toBe(true);
    expect(Object.values(f.industry).some((n) => n > 0)).toBe(true);
  });
});

describe("getFilterFacets — single filter applied", () => {
  it("with stage filter, capability counts reflect that stage", async () => {
    const baseline = await getFilterFacets({});
    const filtered = await getFilterFacets({ stage: ["operations"] });
    // For at least one capability, the operations-filtered count must
    // be <= the baseline count (filter narrows the universe).
    let sawNarrowing = false;
    for (const cap of capList) {
      const b = baseline.capability[cap.slug] ?? 0;
      const f = filtered.capability[cap.slug] ?? 0;
      expect(f).toBeLessThanOrEqual(b);
      if (f < b) sawNarrowing = true;
    }
    expect(sawNarrowing).toBe(true);
  });

  it("with stage filter, the STAGE facet itself isn't filtered (own-axis exclusion)", async () => {
    const baseline = await getFilterFacets({});
    const filtered = await getFilterFacets({ stage: ["operations"] });
    // Own-category facets ignore their own selection, so stage counts
    // are unchanged when only a stage filter is active.
    for (const s of stageList) {
      expect(filtered.stage[s.slug]).toBe(baseline.stage[s.slug]);
    }
  });

  it("with capability filter, the CAPABILITY facet isn't filtered", async () => {
    const baseline = await getFilterFacets({});
    const filtered = await getFilterFacets({ capability: ["scheduling-planning"] });
    for (const c of capList) {
      expect(filtered.capability[c.slug]).toBe(baseline.capability[c.slug]);
    }
  });

  it("with capability filter, stage counts reflect that capability", async () => {
    const baseline = await getFilterFacets({});
    const filtered = await getFilterFacets({ capability: ["scheduling-planning"] });
    let sawNarrowing = false;
    for (const s of stageList) {
      const b = baseline.stage[s.slug] ?? 0;
      const f = filtered.stage[s.slug] ?? 0;
      expect(f).toBeLessThanOrEqual(b);
      if (f < b) sawNarrowing = true;
    }
    expect(sawNarrowing).toBe(true);
  });
});

describe("getFilterFacets — empty result set", () => {
  it("filter combination with zero matches still returns every option (all 0s)", async () => {
    // After the pricing-models replacement (migration 0005) every
    // seeded app has zero pricing tags, so any pricing slug combined
    // with any stage produces an empty universe — but every facet key
    // must still be present.
    const f = await getFilterFacets({
      pricing: ["portfolio-enterprise-agreement"],
      stage: ["feasibility"],
    });
    for (const s of stageList) {
      expect(f.stage).toHaveProperty(s.slug);
      // Stage facet ignores its own filter, so capability/industry/pricing
      // narrowing applies. Both could be 0 here.
      expect(f.stage[s.slug]).toBeGreaterThanOrEqual(0);
    }
    for (const c of capList) {
      expect(f.capability).toHaveProperty(c.slug);
      // No app has the portfolio-size pricing, so capability counts
      // (which DO apply the pricing filter) collapse to 0 across the board.
      expect(f.capability[c.slug]).toBe(0);
    }
    for (const i of industryList) {
      expect(f.industry).toHaveProperty(i.slug);
      expect(f.industry[i.slug]).toBe(0);
    }
  });
});
