export type TaxonomyItem = { slug: string; name: string };

export const capabilities: TaxonomyItem[] = [
  { slug: "ai-agents", name: "AI Agents" },
  { slug: "asset-management", name: "Asset Management" },
  { slug: "building-information-modelling", name: "Building Information Modelling" },
  { slug: "closeout", name: "Closeout" },
  { slug: "contract-management", name: "Contract Management" },
  { slug: "cost-control", name: "Cost Control" },
  { slug: "cost-estimation", name: "Cost Estimation" },
  { slug: "data-integration", name: "Data Integration" },
  { slug: "design-review", name: "Design Review" },
  { slug: "document-control", name: "Document Control" },
  { slug: "field-management", name: "Field Management" },
  { slug: "forecasting", name: "Forecasting" },
  { slug: "hseq", name: "HSEQ" },
  { slug: "monitoring", name: "Monitoring" },
  { slug: "procurement", name: "Procurement" },
  { slug: "project-portfolio-management", name: "Project Portfolio Management" },
  { slug: "quality", name: "Quality" },
  { slug: "reporting", name: "Reporting" },
  { slug: "resource-planning", name: "Resource Planning" },
  { slug: "risk-management", name: "Risk Management" },
  { slug: "scheduling", name: "Scheduling" },
  { slug: "tendering", name: "Tendering" },
];

export const pricingModels: TaxonomyItem[] = [
  { slug: "subscription", name: "Subscription" },
  { slug: "pay-per-use", name: "Pay-per-use" },
  { slug: "service-contract", name: "Service Contract" },
  { slug: "priced-by-project-size", name: "Priced by Project Size" },
  { slug: "priced-by-portfolio-size", name: "Priced by Portfolio Size" },
  { slug: "freemium", name: "Freemium" },
  { slug: "contact-for-pricing", name: "Contact for pricing" },
];

export const industries: TaxonomyItem[] = [
  { slug: "construction", name: "Construction" },
  { slug: "infrastructure", name: "Infrastructure" },
  { slug: "energy", name: "Energy" },
  { slug: "real-estate", name: "Real Estate" },
  { slug: "manufacturing", name: "Manufacturing" },
  { slug: "general", name: "General" },
];

export const regions: TaxonomyItem[] = [
  { slug: "north-america", name: "North America" },
  { slug: "south-america", name: "South America" },
  { slug: "europe", name: "Europe" },
  { slug: "middle-east", name: "Middle East" },
  { slug: "africa", name: "Africa" },
  { slug: "asia-pacific", name: "Asia Pacific" },
  { slug: "oceania", name: "Oceania" },
  { slug: "global", name: "Global" },
];

export const lookups = {
  capability: new Map(capabilities.map((c) => [c.slug, c.name])),
  pricing: new Map(pricingModels.map((p) => [p.slug, p.name])),
  industry: new Map(industries.map((i) => [i.slug, i.name])),
  region: new Map(regions.map((r) => [r.slug, r.name])),
};
