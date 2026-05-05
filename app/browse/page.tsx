import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { SearchBar } from "@/components/browse/search-bar";
import { FilterSidebar } from "@/components/browse/filter-sidebar";
import { FilterDrawer } from "@/components/browse/filter-drawer";
import { StageQuickFilter } from "@/components/browse/stage-quick-filter";
import { ActiveFilters } from "@/components/browse/active-filters";
import { SortTabs } from "@/components/browse/sort-tabs";
import { AppCard } from "@/components/browse/app-card";
import { searchApps, type SortKey } from "@/lib/queries/search";
import { getFilterFacets } from "@/lib/queries/facets";
import { parseFilters, buildHref } from "@/lib/browse/filters";

export const metadata: Metadata = {
  title: "Browse — every project tool, filterable",
  description:
    "Filter, search, and sort the full catalogue of project management and infrastructure software by stage, capability, industry, and pricing model.",
  alternates: { canonical: "/browse" },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

const isSort = (v: string | undefined): v is SortKey =>
  v === "relevance" || v === "az" || v === "recent" || v === "featured";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const state = parseFilters(sp);

  // Page param: silent normalise for non-numeric/zero/negative; explicit
  // 307 only when the user requested a real out-of-range page number.
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const parsedPage = rawPage ? Number.parseInt(rawPage, 10) : NaN;
  const requestedExplicit =
    rawPage != null && Number.isFinite(parsedPage) && parsedPage > 1;
  const page = Math.max(
    1,
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
  );

  const sortParam = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort = isSort(sortParam) ? sortParam : undefined;

  const filters = {
    q: state.q,
    stage: state.stage,
    capability: state.capability,
    industry: state.industry,
    pricing: state.pricing,
    page,
    pageSize: PAGE_SIZE,
    sort,
  };

  const [{ results, total, totalPages, usedFuzzyFallback }, facets] =
    await Promise.all([searchApps(filters), getFilterFacets(filters)]);

  // Out-of-bounds page handling.
  // - Zero results: drop ?page= entirely so the URL stays clean.
  // - Real out-of-range: 307 to last valid page (only if the user explicitly
  //   asked — protects bots from infinite loops on bad ?page= values).
  if (requestedExplicit && total === 0) {
    redirect(buildHref("/browse", { ...state, sort: state.sort }, {}));
  }
  if (requestedExplicit && page > totalPages) {
    const next = new URLSearchParams();
    if (state.q) next.set("q", state.q);
    if (state.stage.length) next.set("stage", state.stage.join(","));
    if (state.capability.length)
      next.set("capability", state.capability.join(","));
    if (state.pricing.length) next.set("pricing", state.pricing.join(","));
    if (state.industry.length) next.set("industry", state.industry.join(","));
    if (sort) next.set("sort", sort);
    if (totalPages > 1) next.set("page", String(totalPages));
    const qs = next.toString();
    redirect(qs ? `/browse?${qs}` : "/browse");
  }

  return (
    <article className="bg-[var(--color-canvas)]">
      <div className="bg-[var(--color-night)]">
        <Container className="py-3 md:py-3.5">
          <h1 className="font-heading text-[14px] leading-tight text-white md:text-[16px]">
            Browse{" "}
            <span className="italic text-[var(--color-magenta)]">every</span>{" "}
            <span className="italic text-[var(--color-coral)]">project</span>{" "}
            product.
          </h1>
        </Container>
      </div>

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

      <Container className="grid gap-10 border-t border-[var(--color-line)] py-10 md:grid-cols-[260px_1fr] md:gap-12 md:py-12">
        <div className="hidden md:block">
          <FilterSidebar facets={facets} />
        </div>

        <div className="min-w-0">
          <FilterDrawer resultCount={total} totalCount={total}>
            <FilterSidebar facets={facets} />
          </FilterDrawer>

          <header className="flex flex-col gap-4 pb-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3">
              <ActiveFilters />
              <p className="hidden text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] md:block">
                Showing{" "}
                <span className="num text-[var(--color-ink)]">
                  {results.length}
                </span>{" "}
                of <span className="num">{total}</span>{" "}
                {total === 1 ? "product" : "products"}
                {totalPages > 1 ? (
                  <>
                    {" "}
                    — page <span className="num">{page}</span> of{" "}
                    <span className="num">{totalPages}</span>
                  </>
                ) : null}
              </p>
            </div>
            <SortTabs />
          </header>

          {usedFuzzyFallback ? (
            <p className="mb-6 border-l-2 border-[var(--color-coral)] pl-3 text-[12px] text-[var(--color-ink-2)]">
              Few strict matches — broadened to fuzzy name + tagline search.
            </p>
          ) : null}

          {results.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((app) => (
                  <li key={app.slug}>
                    <AppCard app={app} />
                  </li>
                ))}
              </ul>
              {totalPages > 1 ? (
                <Pagination page={page} totalPages={totalPages} sp={sp} />
              ) : null}
            </>
          )}
        </div>
      </Container>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] p-12 text-center">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
        No matches
      </p>
      <p className="mx-auto mt-3 max-w-[44ch] text-[15px] text-[var(--color-ink-2)]">
        No tools match the current combination of filters. Try removing one,
        clearing all filters above, or{" "}
        <Link
          href="/suggest"
          className="text-[var(--color-coral)] underline underline-offset-4 hover:text-[var(--color-ink)]"
        >
          suggest an app
        </Link>{" "}
        we should add.
      </p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  sp,
}: {
  page: number;
  totalPages: number;
  sp: Record<string, string | string[] | undefined>;
}) {
  const buildPageUrl = (n: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (key === "page") continue;
      const v = Array.isArray(value) ? value[0] : value;
      if (v) params.set(key, v);
    }
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/browse?${qs}` : "/browse";
  };

  const prev = page > 1 ? buildPageUrl(page - 1) : null;
  const next = page < totalPages ? buildPageUrl(page + 1) : null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex items-center justify-between border-t border-[var(--color-line)] pt-6"
    >
      {prev ? (
        <Link
          href={prev}
          className="group inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
        >
          <ArrowRight
            size={12}
            weight="bold"
            className="rotate-180 transition-transform duration-300 group-hover:-translate-x-0.5"
          />
          Previous
        </Link>
      ) : (
        <span aria-hidden />
      )}
      <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
        Page <span className="num text-[var(--color-ink)]">{page}</span> of{" "}
        <span className="num">{totalPages}</span>
      </p>
      {next ? (
        <Link
          href={next}
          className="group inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
        >
          Next
          <ArrowRight
            size={12}
            weight="bold"
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </Link>
      ) : (
        <span aria-hidden />
      )}
    </nav>
  );
}
