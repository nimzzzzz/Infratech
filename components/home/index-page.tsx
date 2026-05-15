import { Container } from "@/components/site/container";
import { SearchBar } from "@/components/browse/search-bar";
import { FilterSidebar } from "@/components/browse/filter-sidebar";
import { FilterDrawer } from "@/components/browse/filter-drawer";
import { StageQuickFilter } from "@/components/browse/stage-quick-filter";
import { ActiveFilters } from "@/components/browse/active-filters";
import { AppCard } from "@/components/browse/app-card";
import { searchApps } from "@/lib/queries/search";
import { getFilterFacets } from "@/lib/queries/facets";
import { parseFilters } from "@/lib/browse/filters";

/**
 * Home / directory view. The original product mental model — filter
 * sidebar on the left, app cards on the right, search at the top.
 *
 * Powered by lib/queries/search.ts (tsvector match) +
 * lib/queries/facets.ts (live facet counts). Always alphabetical;
 * sort tabs were retired in the design refresh.
 */
export async function HomeIndex({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const state = parseFilters(searchParams);

  const filters = {
    q: state.q,
    stage: state.stage,
    capability: state.capability,
    industry: state.industry,
    pricing: state.pricing,
    pageSize: 1000, // home shows the full set; pagination lives on /browse
  };

  const [{ results, total }, facets] = await Promise.all([
    searchApps(filters),
    getFilterFacets(filters),
  ]);

  return (
    <article className="bg-[var(--color-canvas)]">
      {/* SEARCH + STAGE QUICK FILTER */}
      <section className="relative bg-[var(--color-canvas)]">
        <Container className="pt-8 md:pt-10">
          <div className="max-w-3xl">
            <SearchBar />
          </div>
          <div className="mt-6 md:mt-8">
            <StageQuickFilter />
          </div>
        </Container>
      </section>

      {/* INDEX */}
      <Container className="grid gap-10 border-t border-[var(--color-line)] py-10 md:grid-cols-[260px_1fr] md:gap-12 md:py-12">
        <div className="hidden md:block">
          <FilterSidebar facets={facets} />
        </div>

        <div className="min-w-0">
          <FilterDrawer resultCount={total} totalCount={total}>
            <FilterSidebar facets={facets} />
          </FilterDrawer>

          <header className="flex flex-col gap-3 pb-6">
            <ActiveFilters />
            <p className="hidden text-[15px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] md:block">
              Showing{" "}
              <span className="num text-[var(--color-ink)]">
                {results.length}
              </span>{" "}
              of <span className="num">{total}</span>{" "}
              {total === 1 ? "product" : "products"}
            </p>
          </header>

          {results.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((app) => (
                <li key={app.slug}>
                  <AppCard app={app} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] p-12 text-center">
      <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
        No matches
      </p>
      <p className="mt-3 max-w-[40ch] mx-auto text-[17px] text-[var(--color-ink-2)]">
        No products match the current combination of filters. Try removing
        one, or clearing all filters above.
      </p>
    </div>
  );
}
