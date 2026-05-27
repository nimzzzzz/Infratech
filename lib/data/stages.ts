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

// Display order chosen for the public chip row. Cross-Lifecycle leads as a
// "applies across stages" catch-all; the rest follow the asset lifecycle.
// Slugs and DB ids are unchanged — only the visual order moved.
export const stages: Stage[] = [
  {
    slug: "general",
    name: "Cross-Lifecycle",
    short: "Cross-stage platforms and products.",
    description:
      "Tools used across multiple project phases — not tied to a specific stage.",
    index: "01",
  },
  {
    slug: "feasibility",
    name: "Strategy & Feasibility",
    short: "Strategies, business cases, options analysis.",
    description:
      "Evaluating asset or project viability — market intelligence, site studies, business cases, and options analysis.",
    index: "02",
  },
  {
    slug: "definition",
    name: "Development & Design",
    short: "Scope, planning, development, design.",
    description:
      "Shaping the project — development planning, scope definition, design, engineering, drawings, and BIM models.",
    index: "03",
  },
  {
    slug: "delivery",
    name: "Procure & Deliver",
    short: "Procurement, execution, controls, risk.",
    description:
      "Buying and delivering the work — procurement, construction or implementation, scheduling, controls, quality, and safety.",
    index: "04",
  },
  {
    slug: "post-delivery",
    name: "Handover & Closeout",
    short: "Commissioning, turnover, closeout.",
    description:
      "Turning work into an operable asset — commissioning, punch lists, handover data, O&M manuals, warranties, and closeout.",
    index: "05",
  },
  {
    slug: "operations",
    name: "Operate & Maintain",
    short: "Asset management, monitoring, maintenance.",
    description:
      "Running the asset after handover — maintenance, monitoring, facility management, reliability, and service delivery.",
    index: "06",
  },
  {
    slug: "renewal-exit",
    name: "Renewal & Exit",
    short: "Renewal, repositioning, divestment.",
    description:
      "Changing the asset's future — renewal, retrofit, repositioning, decommissioning, disposal, or divestment.",
    index: "07",
  },
];
