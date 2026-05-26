import { capabilities, pricingModels } from "@/lib/data/taxonomy";
import { stages } from "@/lib/data/stages";
import { formatStageLabel } from "@/lib/stages/format";
import type { FacetCounts } from "@/lib/queries/facets";
import { FilterSection } from "./filter-section";

/**
 * Stage-2 prop shape: takes pre-computed facet counts directly.
 * The sidebar is now a pure render — all counting happens server-side
 * via getFilterFacets(filters) on the page.
 *
 * Industry is promoted to a horizontal quick-filter row above the
 * index, so the sidebar holds lifecycle plus the secondary axes.
 */
export function FilterSidebar({
  facets,
}: {
  facets: FacetCounts;
}) {
  const stageOptions = stages.map((stage) => ({
    slug: stage.slug,
    name: formatStageLabel(stage.slug),
  }));

  return (
    <aside
      className="flex flex-col gap-10 md:sticky md:top-24 md:max-h-[calc(100dvh-7rem)] md:self-start md:overflow-y-auto md:border-r md:border-[var(--color-line)] md:pb-12 md:pr-8"
      aria-label="Filters"
    >
      <FilterSection
        title="Infrastructure lifecycle"
        category="stage"
        options={stageOptions}
        counts={facets.stage}
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
