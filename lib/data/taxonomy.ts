export type TaxonomyItem = { slug: string; name: string };

export const capabilities: TaxonomyItem[] = [
  { slug: "scheduling", name: "Scheduling" },
  { slug: "building-information-modelling", name: "Building Information Modelling" },
  { slug: "ai-agents", name: "AI Agents" },
  { slug: "design-review", name: "Design Review" },
  { slug: "cost-estimation", name: "Cost Estimation" },
  { slug: "procurement", name: "Procurement" },
  { slug: "project-portfolio-management", name: "Project Portfolio Management" },
  { slug: "risk-management", name: "Risk Management" },
  { slug: "document-control", name: "Document Control" },
  { slug: "field-management", name: "Field Management" },
  { slug: "quality", name: "Quality" },
  { slug: "asset-management", name: "Asset Management" },
  { slug: "forecasting", name: "Forecasting" },
  { slug: "resource-planning", name: "Resource Planning" },
  { slug: "cost-control", name: "Cost Control" },
  { slug: "data-integration", name: "Data Integration" },
  { slug: "monitoring", name: "Monitoring" },
  { slug: "hseq", name: "HSEQ" },
  { slug: "reporting", name: "Reporting" },
  { slug: "tendering", name: "Tendering" },
  { slug: "contract-management", name: "Contract Management" },
  { slug: "closeout", name: "Closeout" },
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

export const lookups = {
  capability: new Map(capabilities.map((c) => [c.slug, c.name])),
  pricing: new Map(pricingModels.map((p) => [p.slug, p.name])),
  industry: new Map(industries.map((i) => [i.slug, i.name])),
};
