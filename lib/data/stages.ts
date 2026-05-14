export type Stage = {
  slug: string;
  name: string;
  /** Page-blurb copy — feeds seed.ts → `stages.shortDescription` and
   *  renders on the public stage landing page. */
  short: string;
  /** Wizard-tooltip copy — 1–2 sentences explaining what happens in
   *  this stage of an infrastructure project. Used by the chip row
   *  in TaxonomyStep (and any future stage-picker UI) to disambiguate
   *  the names for vendors who aren't sure where their product fits. */
  description: string;
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
    description:
      "Tools used across multiple project phases — not tied to a specific stage.",
    index: "01",
  },
  {
    slug: "feasibility",
    name: "Feasibility",
    short: "Studies, business cases, options analysis.",
    description:
      "Evaluating project viability — site studies, cost-benefit analysis, initial planning.",
    index: "02",
  },
  {
    slug: "definition",
    name: "Definition",
    short: "Scope, planning, design, contracting.",
    description:
      "Detailed design and engineering — drawings, specifications, BIM models, procurement planning.",
    index: "03",
  },
  {
    slug: "delivery",
    name: "Delivery",
    short: "Execution, scheduling, controls, risk.",
    description:
      "Construction or implementation — site management, scheduling, quality control, safety.",
    index: "04",
  },
  {
    slug: "operations",
    name: "Operations",
    short: "Asset management, monitoring, maintenance.",
    description:
      "Post-handover use of the asset — maintenance, monitoring, facility management.",
    index: "05",
  },
  {
    slug: "post-delivery",
    name: "Post-Delivery",
    short: "Closeout, lessons, decommissioning.",
    description:
      "Closeout, audit, lessons learned, decommissioning or repurposing.",
    index: "06",
  },
];
