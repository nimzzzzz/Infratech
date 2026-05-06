export type Stage = {
  slug: string;
  name: string;
  short: string;
  index: string;
};

// Display order chosen for the public chip row. General leads as a
// "doesn't fit a stage" catch-all; the rest follow the project lifecycle.
// Slugs and DB ids are unchanged — only the visual order moved.
export const stages: Stage[] = [
  {
    slug: "general",
    name: "General",
    short: "Cross-stage platforms and products.",
    index: "01",
  },
  {
    slug: "feasibility",
    name: "Feasibility",
    short: "Studies, business cases, options analysis.",
    index: "02",
  },
  {
    slug: "definition",
    name: "Definition",
    short: "Scope, planning, design, contracting.",
    index: "03",
  },
  {
    slug: "delivery",
    name: "Delivery",
    short: "Execution, scheduling, controls, risk.",
    index: "04",
  },
  {
    slug: "operations",
    name: "Operations",
    short: "Asset management, monitoring, maintenance.",
    index: "05",
  },
  {
    slug: "post-delivery",
    name: "Post-Delivery",
    short: "Closeout, lessons, decommissioning.",
    index: "06",
  },
];

export const stageLookup = (slug: string): Stage | undefined =>
  stages.find((s) => s.slug === slug);

export const stageNameMap = new Map(stages.map((s) => [s.slug, s.name]));
