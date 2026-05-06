import type { AppCard } from "@/lib/queries/apps";

export type FilterKey = "stage" | "capability" | "pricing" | "industry";

export type FilterState = {
  q: string;
  stage: string[];
  capability: string[];
  pricing: string[];
  industry: string[];
};

const splitParam = (value: string | undefined): string[] =>
  value ? value.split(",").filter(Boolean) : [];

export function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): FilterState {
  const raw = (k: string): string | undefined => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    q: raw("q")?.trim() ?? "",
    stage: splitParam(raw("stage")),
    capability: splitParam(raw("capability")),
    pricing: splitParam(raw("pricing")),
    industry: splitParam(raw("industry")),
  };
}

const stageSlugs = (a: AppCard): string[] => a.stages.map((s) => s.slug);

const matchesQuery = (a: AppCard, q: string): boolean => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    a.name.toLowerCase().includes(needle) ||
    a.vendor.name.toLowerCase().includes(needle) ||
    (a.tagline ?? "").toLowerCase().includes(needle) ||
    a.capabilitySlugs.some((c) => c.includes(needle))
  );
};

const matchesCategory = (
  selected: string[],
  appValues: string[] | string | null,
): boolean => {
  if (selected.length === 0) return true;
  if (appValues == null) return false;
  const haystack = Array.isArray(appValues) ? appValues : [appValues];
  return selected.some((s) => haystack.includes(s));
};

export function applyFilters(apps: AppCard[], state: FilterState): AppCard[] {
  const filtered = apps.filter(
    (a) =>
      matchesQuery(a, state.q) &&
      matchesCategory(state.stage, stageSlugs(a)) &&
      matchesCategory(state.capability, a.capabilitySlugs) &&
      matchesCategory(state.pricing, a.pricingSlug) &&
      matchesCategory(state.industry, a.industrySlugs),
  );
  // Always alphabetical by name — sort tabs were removed.
  return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Facet counts: for each option in a category, count apps that match every
 * OTHER active category. Standard library / e-commerce behaviour — counts
 * reflect "if I add this, how many results would I see" rather than "how
 * many of the current results have this property".
 */
export function facetCounts(
  apps: AppCard[],
  state: FilterState,
  category: FilterKey,
  options: string[],
): Record<string, number> {
  const stateWithoutCategory: FilterState = { ...state, [category]: [] };
  const baseline = apps.filter(
    (a) =>
      matchesQuery(a, stateWithoutCategory.q) &&
      matchesCategory(stateWithoutCategory.stage, stageSlugs(a)) &&
      matchesCategory(stateWithoutCategory.capability, a.capabilitySlugs) &&
      matchesCategory(stateWithoutCategory.pricing, a.pricingSlug) &&
      matchesCategory(stateWithoutCategory.industry, a.industrySlugs),
  );

  const accessor = (a: AppCard): string[] => {
    if (category === "stage") return stageSlugs(a);
    if (category === "capability") return a.capabilitySlugs;
    if (category === "pricing") return a.pricingSlug ? [a.pricingSlug] : [];
    return a.industrySlugs;
  };

  const counts: Record<string, number> = {};
  for (const opt of options) {
    counts[opt] = baseline.filter((a) => accessor(a).includes(opt)).length;
  }
  return counts;
}

export function buildHref(
  pathname: string,
  state: FilterState,
  patch: Partial<FilterState>,
): string {
  const next = { ...state, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.stage.length) params.set("stage", next.stage.join(","));
  if (next.capability.length) params.set("capability", next.capability.join(","));
  if (next.pricing.length) params.set("pricing", next.pricing.join(","));
  if (next.industry.length) params.set("industry", next.industry.join(","));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}
