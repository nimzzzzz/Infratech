import type { App } from "@/lib/data/apps";

export type FilterKey = "stage" | "capability" | "pricing" | "industry";
export type SortKey = "az" | "recent" | "featured";

export type FilterState = {
  q: string;
  stage: string[];
  capability: string[];
  pricing: string[];
  industry: string[];
  sort: SortKey;
};

const splitParam = (value: string | undefined): string[] =>
  value ? value.split(",").filter(Boolean) : [];

const isSort = (v: string): v is SortKey =>
  v === "az" || v === "recent" || v === "featured";

export function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): FilterState {
  const raw = (k: string): string | undefined => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const sort = raw("sort");
  return {
    q: raw("q")?.trim() ?? "",
    stage: splitParam(raw("stage")),
    capability: splitParam(raw("capability")),
    pricing: splitParam(raw("pricing")),
    industry: splitParam(raw("industry")),
    sort: sort && isSort(sort) ? sort : "az",
  };
}

const matchesQuery = (app: App, q: string): boolean => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    app.name.toLowerCase().includes(needle) ||
    app.vendor.toLowerCase().includes(needle) ||
    app.blurb.toLowerCase().includes(needle) ||
    app.capabilities.some((c) => c.includes(needle))
  );
};

const matchesCategory = (
  selected: string[],
  appValues: string[] | string,
): boolean => {
  if (selected.length === 0) return true;
  const haystack = Array.isArray(appValues) ? appValues : [appValues];
  return selected.some((s) => haystack.includes(s));
};

export function applyFilters(apps: App[], state: FilterState): App[] {
  const filtered = apps.filter(
    (app) =>
      matchesQuery(app, state.q) &&
      matchesCategory(state.stage, app.stages) &&
      matchesCategory(state.capability, app.capabilities) &&
      matchesCategory(state.pricing, app.pricing) &&
      matchesCategory(state.industry, app.industries),
  );

  return [...filtered].sort((a, b) => {
    if (state.sort === "az") return a.name.localeCompare(b.name);
    if (state.sort === "recent")
      return b.addedAt.localeCompare(a.addedAt);
    // featured
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Facet counts: for each option in a category, count apps that match every
 * OTHER active category and have this option. This is the standard library /
 * e-commerce behaviour — counts reflect "if I add this, how many results would
 * I see" rather than "how many of the current results have this property".
 */
export function facetCounts(
  apps: App[],
  state: FilterState,
  category: FilterKey,
  options: string[],
): Record<string, number> {
  const stateWithoutCategory: FilterState = { ...state, [category]: [] };
  const baseline = apps.filter(
    (app) =>
      matchesQuery(app, stateWithoutCategory.q) &&
      matchesCategory(stateWithoutCategory.stage, app.stages) &&
      matchesCategory(stateWithoutCategory.capability, app.capabilities) &&
      matchesCategory(stateWithoutCategory.pricing, app.pricing) &&
      matchesCategory(stateWithoutCategory.industry, app.industries),
  );

  const accessor = (app: App): string[] => {
    if (category === "stage") return app.stages;
    if (category === "capability") return app.capabilities;
    if (category === "pricing") return [app.pricing];
    return app.industries;
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
  if (next.sort !== "az") params.set("sort", next.sort);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}
