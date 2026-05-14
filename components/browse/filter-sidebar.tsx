import { capabilities, industries, pricingModels } from "@/lib/data/taxonomy";
import type { FacetCounts } from "@/lib/queries/facets";
import { FilterSection } from "./filter-section";

/**
 * Stage-2 prop shape: takes pre-computed facet counts directly.
 * The sidebar is now a pure render — all counting happens server-side
 * via getFilterFacets(filters) on the page.
 *
 * Stage is promoted out to a horizontal quick-filter row above the
 * index, so the sidebar holds the secondary axes only (capability,
 * pricing, industry).
 */
export function FilterSidebar({
  facets,
}: {
  facets: FacetCounts;
}) {
  return (
    <aside
      className="flex flex-col gap-10 md:sticky md:top-24 md:max-h-[calc(100dvh-7rem)] md:self-start md:overflow-y-auto md:border-r md:border-[var(--color-line)] md:pb-12 md:pr-8"
      aria-label="Filters"
    >
      <FilterSection
        title="Industry"
        category="industry"
        options={industries}
        counts={facets.industry}
      />
      <FilterSection
        title="Capability"
        category="capability"
        options={capabilities}
        counts={facets.capability}
        searchable
        scrollable
      />
      <FilterSection
        title="Pricing"
        category="pricing"
        options={pricingModels}
        counts={facets.pricing}
      />
    </aside>
  );
}
