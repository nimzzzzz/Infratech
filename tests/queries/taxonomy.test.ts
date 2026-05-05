import { describe, it, expect } from "vitest";
import {
  listStages,
  listCapabilities,
  listIndustries,
  listPricingModels,
  listRegions,
  getStageBySlug,
  getCapabilityBySlug,
} from "@/lib/queries/taxonomy";

describe("taxonomy queries", () => {
  it("listStages returns 6 stages in position order", async () => {
    const stages = await listStages();
    expect(stages).toHaveLength(6);
    // First stage in seed is feasibility (position 0)
    expect(stages[0].slug).toBe("feasibility");
    // Positions are monotonically increasing
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].position).toBeGreaterThanOrEqual(stages[i - 1].position);
    }
  });

  it("listCapabilities returns the 22 seeded capabilities", async () => {
    const caps = await listCapabilities();
    expect(caps).toHaveLength(22);
    const slugs = caps.map((c) => c.slug);
    expect(slugs).toContain("scheduling");
  });

  it("listIndustries returns 6 industries", async () => {
    const inds = await listIndustries();
    expect(inds).toHaveLength(6);
  });

  it("listPricingModels returns 7 pricing models", async () => {
    const pms = await listPricingModels();
    expect(pms).toHaveLength(7);
  });

  it("listRegions returns 8 regions", async () => {
    const regions = await listRegions();
    expect(regions).toHaveLength(8);
  });

  it("getStageBySlug returns the stage for a known slug", async () => {
    const stage = await getStageBySlug("delivery");
    expect(stage?.slug).toBe("delivery");
    expect(stage?.name).toBe("Delivery");
  });

  it("getStageBySlug returns null for unknown slug", async () => {
    const stage = await getStageBySlug("does-not-exist");
    expect(stage).toBeNull();
  });

  it("getCapabilityBySlug returns the capability for a known slug", async () => {
    const cap = await getCapabilityBySlug("scheduling");
    expect(cap?.slug).toBe("scheduling");
  });

  it("getCapabilityBySlug returns null for unknown slug", async () => {
    const cap = await getCapabilityBySlug("nonsense-capability");
    expect(cap).toBeNull();
  });
});
