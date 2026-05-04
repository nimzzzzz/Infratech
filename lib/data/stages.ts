export type Stage = {
  slug: string;
  name: string;
  short: string;
  index: string;
};

export const stages: Stage[] = [
  {
    slug: "feasibility",
    name: "Feasibility",
    short: "Studies, business cases, options analysis.",
    index: "01",
  },
  {
    slug: "definition",
    name: "Definition",
    short: "Scope, planning, design, contracting.",
    index: "02",
  },
  {
    slug: "delivery",
    name: "Delivery",
    short: "Execution, scheduling, controls, risk.",
    index: "03",
  },
  {
    slug: "operations",
    name: "Operations",
    short: "Asset management, monitoring, maintenance.",
    index: "04",
  },
  {
    slug: "post-delivery",
    name: "Post-Delivery",
    short: "Closeout, lessons, decommissioning.",
    index: "05",
  },
  {
    slug: "general",
    name: "General",
    short: "Cross-stage platforms and products.",
    index: "06",
  },
];

export const stageLookup = (slug: string): Stage | undefined =>
  stages.find((s) => s.slug === slug);

export const stageNameMap = new Map(stages.map((s) => [s.slug, s.name]));
