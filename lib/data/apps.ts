export type App = {
  slug: string;
  name: string;
  /** Display name. Kept for legacy display sites; canonical link is vendorSlug. */
  vendor: string;
  /** Foreign key into lib/data/vendors.ts. */
  vendorSlug: string;
  blurb: string;
  description: string;
  websiteUrl: string;
  appleAppStoreUrl?: string;
  googlePlayUrl?: string;
  stages: string[];
  capabilities: string[];
  industries: string[];
  pricing: string;
  founded: number;
  featured: boolean;
  addedAt: string;
  editorNote?: string;
};

export const apps: App[] = [
  {
    slug: "alice-technologies",
    name: "ALICE Technologies",
    vendor: "ALICE Technologies",
    vendorSlug: "alice-technologies",
    blurb:
      "Generative scheduling that explores millions of build sequences against time and cost objectives.",
    description:
      "ALICE generates and compares construction schedule scenarios at a scale planners can't reach manually — the engine takes a project's activities, durations, and crew constraints and explores millions of valid sequences against the team's chosen objectives (shortest duration, lowest cost, fewest crew swings, fastest revenue date). Planners use it for two main moves: pre-bid optioneering, and mid-project rebaselining when the original sequence stops fitting reality.\n\nThe product integrates with Primavera P6 and Microsoft Project as the import / export interface, so the underlying contract schedule stays in the canonical product while ALICE acts as the optimisation layer on top.",
    websiteUrl: "https://www.alicetechnologies.com",
    stages: ["definition", "delivery"],
    capabilities: ["scheduling", "ai-agents", "forecasting"],
    industries: ["construction", "infrastructure"],
    pricing: "subscription",
    founded: 2014,
    featured: false,
    addedAt: "2026-04-12",
  },
  {
    slug: "bimcrone",
    name: "BIMCRONE",
    vendor: "BIMCRONE",
    vendorSlug: "bimcrone",
    blurb:
      "4D BIM and progress tracking from a phone in the field. Captures install rate against the model in real time.",
    description:
      "BIMCRONE is a mobile-first 4D BIM product that lets site teams mark elements complete directly against the federated model from a phone or tablet. Installed quantities roll up to dashboards in near-real-time, and the system reconciles actual install rate against the planned baseline so the schedule team sees variance the same day rather than at the end of the month.\n\nMost commonly deployed on MEP-heavy fit-out projects where install rate is the binding constraint and the foreman wants something faster than walking the site with a printout.",
    websiteUrl: "https://www.bimcrone.com",
    stages: ["delivery"],
    capabilities: ["building-information-modelling", "field-management", "monitoring"],
    industries: ["construction"],
    pricing: "subscription",
    founded: 2019,
    featured: false,
    addedAt: "2026-04-22",
  },
  {
    slug: "bridge2ai",
    name: "Bridge2AI",
    vendor: "Bridge2AI",
    vendorSlug: "bridge2ai",
    blurb:
      "AI agents that read RFP documents and draft compliant responses with traceable citations.",
    description:
      "Bridge2AI ingests a tender package — RFP, employer's information requirements, contract conditions, technical specs — and drafts a proposal response that maps each question to a sourced answer, with a citation back to the relevant clause. The team using it spends review time editing positioning rather than chasing down which spec section the question came from.\n\nUseful where bid teams are small relative to the volume of opportunities, and the bottleneck is reading speed rather than technical knowledge.",
    websiteUrl: "https://www.bridge2ai.com",
    stages: ["feasibility", "definition"],
    capabilities: ["ai-agents", "tendering", "document-control"],
    industries: ["construction", "infrastructure", "general"],
    pricing: "subscription",
    founded: 2023,
    featured: false,
    addedAt: "2026-04-28",
  },
  {
    slug: "buildroid",
    name: "Buildroid",
    vendor: "Buildroid Robotics",
    vendorSlug: "buildroid-robotics",
    blurb:
      "Autonomous site delivery robots for active construction projects. Move material; reduce manual handling.",
    description:
      "Buildroid deploys autonomous wheeled platforms that move materials around active construction sites — primarily plasterboard, framing studs, and packaged MEP components from the laydown area to the install location. The robots map the site from BIM and re-localise on the fly using markers, with a remote-supervisor model where one operator monitors a fleet.\n\nDeployment is usually pay-per-move on early projects, with a path to fleet rental on repeat sites. ROI argument hinges on reduced manual handling injuries and trade-time recovered from material runs.",
    websiteUrl: "https://www.buildroid.io",
    stages: ["delivery"],
    capabilities: ["field-management"],
    industries: ["construction"],
    pricing: "pay-per-use",
    founded: 2021,
    featured: false,
    addedAt: "2026-03-30",
  },
  {
    slug: "nplan",
    name: "nPlan",
    vendor: "nPlan Ltd.",
    vendorSlug: "nplan",
    blurb:
      "Machine-learning risk analysis trained on a million construction schedules. Surfaces delay risk early.",
    description:
      "nPlan benchmarks a project schedule against a corpus of completed projects (publicly cited as over a million) and outputs a probabilistic delay forecast for each activity, plus a quantitative confidence range for the project completion date. Output is most useful at gateway approvals and quarterly reviews — sponsors get an empirical second opinion to set against the contractor's submitted programme.\n\nIngest is from P6 / MSP. The team usually engages on a per-project or per-portfolio basis with a paid pilot before broader rollout.",
    websiteUrl: "https://www.nplan.io",
    stages: ["definition", "delivery"],
    capabilities: ["risk-management", "forecasting", "scheduling"],
    industries: ["construction", "infrastructure", "energy"],
    pricing: "contact-for-pricing",
    founded: 2017,
    featured: true,
    addedAt: "2026-02-14",
    editorNote:
      "The category-defining application of ML to scheduling risk; widely cited but still early in adoption.",
  },
  {
    slug: "primavera-p6",
    name: "Primavera P6",
    vendor: "Oracle",
    vendorSlug: "oracle",
    blurb:
      "Enterprise project portfolio management for capital projects. The default in EPC controls.",
    description:
      "Primavera P6 is the standard schedule and cost-control system in EPC, infrastructure, and major-programme delivery. Its core value isn't features — it's contractual standing: the schedule that owners, EPCs, and major contractors review, claim against, and adjudicate from is, in most large programmes, a P6 schedule. The skills market, training pipeline, and consulting industry are organised around it.\n\nProcurement is enterprise. The Cloud / EPPM / Professional editions cover different team sizes; most large programmes run EPPM with role-based access for the owner, contractor, and consultant teams.",
    websiteUrl: "https://www.oracle.com/construction-engineering/primavera-p6/",
    stages: ["definition", "delivery"],
    capabilities: [
      "scheduling",
      "cost-control",
      "resource-planning",
      "project-portfolio-management",
    ],
    industries: ["construction", "infrastructure", "energy"],
    pricing: "subscription",
    founded: 1983,
    featured: true,
    addedAt: "2026-01-08",
    editorNote:
      "A category of one. The schedule is the contract on most capital programmes, and the contract is in P6.",
  },
  {
    slug: "procore",
    name: "Procore",
    vendor: "Procore Technologies",
    vendorSlug: "procore-technologies",
    blurb:
      "Construction management platform for the field and the office. One record from drawings to closeout.",
    description:
      "Procore is the market-leading construction management platform in North America and increasingly elsewhere. It covers drawings, RFIs, submittals, daily logs, photos, change orders, and field execution from one record — the operational system the project superintendent works in every day, and the audit trail the owner reviews at handover.\n\nSold as a per-project licence priced by construction value, with an extensive third-party ecosystem (estimating, scheduling, financials) integrated through their App Marketplace.",
    websiteUrl: "https://www.procore.com",
    appleAppStoreUrl: "https://apps.apple.com/us/app/procore/id374930542",
    googlePlayUrl:
      "https://play.google.com/store/apps/details?id=com.procore.activities",
    stages: ["delivery"],
    capabilities: ["document-control", "field-management", "quality"],
    industries: ["construction"],
    pricing: "priced-by-project-size",
    founded: 2002,
    featured: true,
    addedAt: "2026-01-15",
    editorNote:
      "The default mid-to-upper-tier GC choice in North America; gaining ground in Europe and the Gulf.",
  },
  {
    slug: "rdash",
    name: "Rdash",
    vendor: "Rdash",
    vendorSlug: "rdash",
    blurb:
      "Operational dashboards for housing and asset maintenance teams. Built around live works orders.",
    description:
      "Rdash gives housing associations, social landlords, and infrastructure asset owners a live operational dashboard built on top of their works-order system. Teams see open jobs, SLA risk, contractor performance, and resident-impact metrics from one screen rather than chasing reports across half a dozen contractor portals.\n\nIntegrates with the major housing management systems and contractor scheduling products. Mostly deployed at the in-house repairs team or asset director level, where the user is operational rather than IT.",
    websiteUrl: "https://www.rdash.com",
    stages: ["operations", "post-delivery"],
    capabilities: ["asset-management", "reporting", "monitoring"],
    industries: ["real-estate", "infrastructure"],
    pricing: "subscription",
    founded: 2018,
    featured: false,
    addedAt: "2026-04-02",
  },
  {
    slug: "white-helmet-safety",
    name: "White Helmet",
    vendor: "White Helmet Safety",
    vendorSlug: "white-helmet-safety",
    blurb:
      "Field HSEQ inspections, observations and incident reporting on mobile. Photo-first capture.",
    description:
      "White Helmet replaces paper or PDF safety inspections with a mobile capture flow built around photos and structured observations. Site walks generate routable findings (responsible party, severity, due date) instead of PDF reports that no one reads. Incident reports follow the same flow, with an escalation path for serious near-misses or RIDDOR-reportables.\n\nDeployed at site or business-unit level. Output rolls up to HSE leadership for trend analysis across multiple projects.",
    websiteUrl: "https://www.whitehelmet.io",
    stages: ["delivery", "operations"],
    capabilities: ["hseq", "field-management", "reporting"],
    industries: ["construction"],
    pricing: "subscription",
    founded: 2016,
    featured: false,
    addedAt: "2026-03-04",
  },
  {
    slug: "cognite-data-fusion",
    name: "Cognite Data Fusion",
    vendor: "Cognite",
    vendorSlug: "cognite",
    blurb:
      "Industrial DataOps for asset-heavy operators. Contextualises sensor, document, and 3D data for operational use.",
    description:
      "Cognite Data Fusion contextualises raw operational data — sensor streams, equipment registers, P&ID diagrams, 3D scans, document archives — into a queryable knowledge graph that operational engineers and data teams can build applications on top of.\n\nDeployment is typically a 6-12 month engagement with a dedicated solutions team. Reference customers include Aker BP, Lyse Energi, and a number of European utilities and downstream operators.",
    websiteUrl: "https://www.cognite.com",
    stages: ["operations", "post-delivery"],
    capabilities: ["asset-management", "data-integration", "monitoring"],
    industries: ["energy", "manufacturing"],
    pricing: "contact-for-pricing",
    founded: 2016,
    featured: true,
    addedAt: "2026-02-01",
    editorNote:
      "The reference industrial data platform for upstream and downstream energy operators.",
  },
  {
    slug: "ms-project",
    name: "Microsoft Project",
    vendor: "Microsoft",
    vendorSlug: "microsoft",
    blurb:
      "Long-tenured planning and Gantt product. Familiar to most stakeholders; pairs with Microsoft 365 controls.",
    description:
      "Microsoft Project remains the most familiar scheduling product across the project management market — most stakeholders can read a Project Gantt without needing a tutorial. The current Project for the Web product is a substantial rebuild on top of the Microsoft 365 ecosystem, with Power BI, Teams, and SharePoint as the natural reporting and collaboration layer.\n\nUseful as the canonical schedule for projects below the threshold where Primavera P6 makes sense, and for in-house programmes where the team is already on the Microsoft stack.",
    websiteUrl: "https://www.microsoft.com/en-us/microsoft-365/project/project-management-software",
    stages: ["definition", "delivery", "general"],
    capabilities: ["scheduling", "resource-planning"],
    industries: ["general", "construction", "infrastructure"],
    pricing: "subscription",
    founded: 1984,
    featured: false,
    addedAt: "2026-01-22",
  },
  {
    slug: "aconex",
    name: "Aconex",
    vendor: "Oracle",
    vendorSlug: "oracle",
    blurb:
      "Document control and design review for major capital programmes. Cross-organisation workflows by default.",
    description:
      "Aconex is a cross-organisation document control and project collaboration platform built around the reality of large capital programmes — owner, multiple consultants, multiple contractors, all needing to share controlled documents, RFIs, and design submissions across organisational boundaries. The neutral-ground architecture (every party owns their content; no single party owns the platform) is what made it the default at this end of the market.\n\nMost commonly deployed on infrastructure mega-projects and the larger end of commercial construction.",
    websiteUrl: "https://www.oracle.com/construction-engineering/aconex/",
    appleAppStoreUrl:
      "https://apps.apple.com/us/app/oracle-aconex/id1450647306",
    googlePlayUrl:
      "https://play.google.com/store/apps/details?id=com.oracle.aconex",
    stages: ["definition", "delivery"],
    capabilities: ["document-control", "design-review", "contract-management"],
    industries: ["construction", "infrastructure", "energy"],
    pricing: "subscription",
    founded: 2000,
    featured: false,
    addedAt: "2026-03-18",
  },
  {
    slug: "synchro-4d",
    name: "Synchro 4D",
    vendor: "Bentley Systems",
    vendorSlug: "bentley-systems",
    blurb:
      "4D model-based scheduling that ties activities to BIM elements for sequence rehearsal and field comms.",
    description:
      "Synchro 4D ties schedule activities to BIM elements so the team can rehearse the build sequence visually before site work begins, then use the same model to communicate next week's plan to the field. Useful on phased fit-outs, complex civil engineering sequences, and bid presentations where the visual makes the construction logic legible to non-experts.\n\nPairs with most major scheduling products (P6, MSP) for the underlying activity data.",
    websiteUrl: "https://www.bentley.com/software/synchro/",
    stages: ["definition", "delivery"],
    capabilities: ["building-information-modelling", "scheduling"],
    industries: ["construction", "infrastructure"],
    pricing: "subscription",
    founded: 2001,
    featured: false,
    addedAt: "2026-03-25",
  },
  {
    slug: "maximo",
    name: "Maximo",
    vendor: "IBM",
    vendorSlug: "ibm",
    blurb:
      "Enterprise asset management for high-value installations. Maintenance, work orders, and reliability in one record.",
    description:
      "Maximo is the long-standing enterprise asset management system for high-value installations — large process plants, transit networks, utility infrastructure. It manages work orders, preventive maintenance schedules, parts inventory, and reliability analysis from one canonical record, and is the system of record auditors expect to see in regulated environments.\n\nDeployment is enterprise-scale, typically as part of a multi-year operations transformation. Maximo Application Suite (MAS) is the current container that bundles the asset management, monitoring, predict, and visual inspection modules.",
    websiteUrl: "https://www.ibm.com/products/maximo",
    stages: ["operations", "post-delivery"],
    capabilities: ["asset-management", "monitoring", "procurement"],
    industries: ["energy", "manufacturing", "infrastructure"],
    pricing: "subscription",
    founded: 2006,
    featured: false,
    addedAt: "2026-02-26",
  },
  {
    slug: "smartpm",
    name: "SmartPM",
    vendor: "SmartPM Technologies",
    vendorSlug: "smartpm-technologies",
    blurb:
      "Schedule analytics that score quality, compression, and slip on construction programmes nightly.",
    description:
      "SmartPM ingests a project's P6 schedule each night and runs a battery of analytics: schedule quality score (DCMA-style logic checks), compression analysis (where the team is making up time on paper rather than in reality), and slip tracking by activity. Output is a daily dashboard most useful at the project controls director level — patterns surface before the monthly report does.\n\nSold as a subscription per active project, with packaged onboarding for portfolio-level deployments at GCs and owners.",
    websiteUrl: "https://www.smartpmtech.com",
    stages: ["delivery"],
    capabilities: ["scheduling", "forecasting", "reporting"],
    industries: ["construction"],
    pricing: "subscription",
    founded: 2014,
    featured: false,
    addedAt: "2026-04-08",
  },
];

export const featuredApps = apps.filter((a) => a.featured);

/** All apps belonging to a given vendor. */
export const appsByVendor = (vendorSlug: string) =>
  apps.filter((a) => a.vendorSlug === vendorSlug);
