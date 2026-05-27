export type TaxonomyItem = { slug: string; name: string };

export const capabilities: TaxonomyItem[] = [
  { slug: "ai-workflow-automation", name: "AI & Workflow Automation" },
  { slug: "analytics-reporting", name: "Analytics & Reporting" },
  { slug: "asset-facility-management", name: "Asset & Facility Management" },
  { slug: "bim-model-coordination", name: "BIM & Model Coordination" },
  { slug: "capital-planning-valuation", name: "Capital Planning & Valuation" },
  { slug: "contracts-commercial-management", name: "Contracts & Commercial Management" },
  { slug: "cost-management", name: "Cost Management" },
  { slug: "data-integration-apis", name: "Data Integration & APIs" },
  { slug: "design-review", name: "Design Review" },
  { slug: "documents-cde", name: "Documents & CDE" },
  { slug: "energy-carbon-sustainability", name: "Energy, Carbon & Sustainability" },
  { slug: "field-execution", name: "Field Execution" },
  { slug: "gis-mapping", name: "GIS & Mapping" },
  { slug: "handover-closeout", name: "Handover & Closeout" },
  { slug: "maintenance-work-orders", name: "Maintenance & Work Orders" },
  { slug: "market-site-intelligence", name: "Market & Site Intelligence" },
  { slug: "portfolio-program-management", name: "Portfolio & Program Management" },
  { slug: "procurement-supply-chain", name: "Procurement & Supply Chain" },
  { slug: "progress-reality-capture", name: "Progress & Reality Capture" },
  { slug: "quality-inspections", name: "Quality & Inspections" },
  { slug: "risk-management", name: "Risk Management" },
  { slug: "safety-compliance", name: "Safety & Compliance" },
  { slug: "scheduling-planning", name: "Scheduling & Planning" },
  { slug: "space-occupancy", name: "Space & Occupancy" },
  { slug: "tenant-resident-experience", name: "Tenant / Resident Experience" },
];

export const pricingModels: TaxonomyItem[] = [
  { slug: "per-seat", name: "Per Seat" },
  { slug: "per-project-program", name: "Per Project / Program" },
  { slug: "per-asset-site-unit", name: "Per Asset / Site / Unit" },
  { slug: "usage-volume-based", name: "Usage / Volume-Based" },
  { slug: "transaction-value-based", name: "Transaction / Value-Based" },
  { slug: "portfolio-enterprise-agreement", name: "Portfolio / Enterprise Agreement" },
  { slug: "services-implementation-contract", name: "Services / Implementation Contract" },
];

export const industries: TaxonomyItem[] = [
  { slug: "construction", name: "Construction & Capital Projects" },
  { slug: "manufacturing", name: "Industrial & Manufacturing" },
  { slug: "natural-resources", name: "Natural Resources" },
  { slug: "public-civic-assets", name: "Public & Civic Assets" },
  { slug: "real-estate", name: "Real Estate & Facilities" },
  { slug: "infrastructure", name: "Transport & Civil Infrastructure" },
  { slug: "energy", name: "Utilities & Energy" },
  { slug: "general", name: "Cross-Market" },
];

export const regions: TaxonomyItem[] = [
  { slug: "global", name: "All" },
  { slug: "north-america", name: "North America" },
  { slug: "south-america", name: "South America" },
  { slug: "europe", name: "Europe" },
  { slug: "middle-east", name: "Middle East" },
  { slug: "africa", name: "Africa" },
  { slug: "asia-pacific", name: "Asia Pacific" },
  { slug: "oceania", name: "Australia" },
];

export const lookups = {
  capability: new Map(capabilities.map((c) => [c.slug, c.name])),
  pricing: new Map(pricingModels.map((p) => [p.slug, p.name])),
  industry: new Map(industries.map((i) => [i.slug, i.name])),
  region: new Map(regions.map((r) => [r.slug, r.name])),
};
