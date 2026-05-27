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
  it("listStages returns 7 stages in position order", async () => {
    const stages = await listStages();
    expect(stages).toHaveLength(7);
    expect(stages.map((s) => s.name)).toEqual([
      "Cross-Lifecycle",
      "Strategy & Feasibility",
      "Development & Design",
      "Procure & Deliver",
      "Handover & Closeout",
      "Operate & Maintain",
      "Renewal & Exit",
    ]);
    // Positions are monotonically increasing
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].position).toBeGreaterThanOrEqual(stages[i - 1].position);
    }
  });

  it("listCapabilities returns the 25 seeded capabilities", async () => {
    const caps = await listCapabilities();
    expect(caps).toHaveLength(25);
    const slugs = caps.map((c) => c.slug);
    expect(slugs).toContain("capital-planning-valuation");
    expect(slugs).toContain("scheduling-planning");
  });

  it("listIndustries returns 8 markets", async () => {
    const inds = await listIndustries();
    expect(inds).toHaveLength(8);
    expect(inds.map((i) => i.name)).toContain("Cross-Market");
    expect(inds.map((i) => i.name)).toContain("Real Estate & Facilities");
  });

  it("listPricingModels returns 7 pricing-basis models", async () => {
    const pms = await listPricingModels();
    expect(pms).toHaveLength(7);
    expect(pms.map((p) => p.name)).toContain("Per Asset / Site / Unit");
    expect(pms.map((p) => p.name)).toContain(
      "Portfolio / Enterprise Agreement",
    );
  });

  it("listRegions returns 8 regions", async () => {
    const regions = await listRegions();
    expect(regions).toHaveLength(8);
  });

  it("getStageBySlug returns the stage for a known slug", async () => {
    const stage = await getStageBySlug("delivery");
    expect(stage?.slug).toBe("delivery");
    expect(stage?.name).toBe("Procure & Deliver");
  });

  it("getStageBySlug returns null for unknown slug", async () => {
    const stage = await getStageBySlug("does-not-exist");
    expect(stage).toBeNull();
  });

  it("getCapabilityBySlug returns the capability for a known slug", async () => {
    const cap = await getCapabilityBySlug("capital-planning-valuation");
    expect(cap?.slug).toBe("capital-planning-valuation");
    expect(cap?.name).toBe("Capital Planning & Valuation");
  });

  it("getCapabilityBySlug returns null for unknown slug", async () => {
    const cap = await getCapabilityBySlug("nonsense-capability");
    expect(cap).toBeNull();
  });
});
