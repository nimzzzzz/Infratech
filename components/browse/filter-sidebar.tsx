import { capabilities, industries, pricingModels } from "@/lib/data/taxonomy";
import { apps } from "@/lib/data/apps";
import { facetCounts, parseFilters } from "@/lib/browse/filters";
import { FilterSection } from "./filter-section";

export function FilterSidebar({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const state = parseFilters(searchParams);

  // Stage is promoted out to a horizontal quick-filter row above the index;
  // the sidebar holds the secondary axes only.
  const capabilityCounts = facetCounts(
    apps,
    state,
    "capability",
    capabilities.map((c) => c.slug),
  );
  const pricingCounts = facetCounts(
    apps,
    state,
    "pricing",
    pricingModels.map((p) => p.slug),
  );
  const industryCounts = facetCounts(
    apps,
    state,
    "industry",
    industries.map((i) => i.slug),
  );

  return (
    <aside
      className="flex flex-col gap-10 md:sticky md:top-24 md:max-h-[calc(100dvh-7rem)] md:self-start md:overflow-y-auto md:border-r md:border-[var(--color-line)] md:pb-12 md:pr-8"
      aria-label="Filters"
    >
      <FilterSection
        title="Capability"
        category="capability"
        options={capabilities}
        counts={capabilityCounts}
        searchable
        scrollable
      />
      <FilterSection
        title="Pricing"
        category="pricing"
        options={pricingModels}
        counts={pricingCounts}
      />
      <FilterSection
        title="Industry"
        category="industry"
        options={industries}
        counts={industryCounts}
      />
    </aside>
  );
}
