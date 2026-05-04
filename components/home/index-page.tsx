import { Container } from "@/components/site/container";
import { SearchBar } from "@/components/browse/search-bar";
import { FilterSidebar } from "@/components/browse/filter-sidebar";
import { FilterDrawer } from "@/components/browse/filter-drawer";
import { StageQuickFilter } from "@/components/browse/stage-quick-filter";
import { ActiveFilters } from "@/components/browse/active-filters";
import { SortTabs } from "@/components/browse/sort-tabs";
import { AppCard } from "@/components/browse/app-card";
import { apps } from "@/lib/data/apps";
import { applyFilters, parseFilters } from "@/lib/browse/filters";
import { stages } from "@/lib/data/stages";
import { capabilities } from "@/lib/data/taxonomy";

const TARGET_TOTAL = 218;

export async function HomeIndex({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const state = parseFilters(searchParams);
  const results = applyFilters(apps, state);

  return (
    <article className="bg-[var(--color-canvas)]">
      {/* SLIM MASTHEAD — single-line strip under the header */}
      <div className="bg-[var(--color-night)]">
        <Container className="py-3 md:py-3.5">
          <h1 className="font-heading text-[14px] leading-tight text-white md:text-[16px]">
            An index of{" "}
            <span className="italic text-[var(--color-magenta)]">every</span>{" "}
            <span className="italic text-[var(--color-coral)]">project</span>{" "}
            tool.
          </h1>
        </Container>
      </div>

      {/* STATS RAIL + SEARCH */}
      <section className="relative bg-[var(--color-canvas)]">
        <Container className="pt-8 md:pt-10">
          <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-[var(--color-line-strong)] pt-6 text-[12px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
            <Stat n={apps.length} suffix={`of ${TARGET_TOTAL}`} label="Tools" />
            <Stat n={stages.length} label="Stages" />
            <Stat n={capabilities.length} label="Capabilities" />
            <span className="ml-auto text-[var(--color-ink-3)]">
              Refreshed weekly
            </span>
          </dl>
          <div className="mt-8 max-w-3xl md:mt-10">
            <SearchBar />
          </div>
          <div className="mt-6 md:mt-8">
            <StageQuickFilter />
          </div>
        </Container>
      </section>

      {/* INDEX */}
      <Container className="grid gap-10 border-t border-[var(--color-line)] py-10 md:grid-cols-[260px_1fr] md:gap-12 md:py-12">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <FilterSidebar searchParams={searchParams} />
        </div>

        <div className="min-w-0">
          {/* Mobile drawer (sticky trigger + slide-in panel). Hidden above md. */}
          <FilterDrawer
            resultCount={results.length}
            totalCount={apps.length}
          >
            <FilterSidebar searchParams={searchParams} />
          </FilterDrawer>

          <header className="flex flex-col gap-4 pb-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3">
              <ActiveFilters />
              <p className="hidden text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] md:block">
                Showing{" "}
                <span className="num text-[var(--color-ink)]">
                  {results.length}
                </span>{" "}
                of <span className="num">{apps.length}</span> tools
              </p>
            </div>
            <SortTabs />
          </header>

          {results.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((app, i) => (
                <li key={app.slug}>
                  <AppCard app={app} index={i + 1} />
                </li>
              ))}
            </ul>
          )}

          <p className="mt-12 max-w-[60ch] text-[12px] leading-relaxed text-[var(--color-ink-3)]">
            Listed for reference. Inclusion is not an endorsement by Resolute
            Management Consultancy.
          </p>
        </div>
      </Container>
    </article>
  );
}

function Stat({
  n,
  label,
  suffix,
}: {
  n: number;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="inline-flex items-baseline gap-1.5">
      <span className="num text-[var(--color-ink)]">
        {String(n).padStart(2, "0")}
      </span>
      {suffix ? (
        <span className="num text-[var(--color-ink-3)]">{suffix}</span>
      ) : null}
      <span>{label}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] p-12 text-center">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
        No matches
      </p>
      <p className="mt-3 max-w-[40ch] mx-auto text-[15px] text-[var(--color-ink-2)]">
        No tools match the current combination of filters. Try removing one, or
        clearing all filters above.
      </p>
    </div>
  );
}
