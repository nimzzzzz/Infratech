import { Container } from "@/components/site/container";
import { SearchBar } from "@/components/browse/search-bar";
import { StageQuickFilter } from "@/components/browse/stage-quick-filter";
import { AppCard } from "@/components/browse/app-card";
import { listApps } from "@/lib/queries/apps";

/**
 * Home / browse-index. Stage 1 wires this up to the DB but deliberately
 * skips the FilterSidebar + applyFilters logic — those live in
 * lib/browse/filters.ts which still operates on the legacy mock-data
 * shape. The /browse page in Stage 2 will refactor filtering against
 * AppCard (slim DB shape) and re-introduce the sidebar, drawer, sort
 * tabs, and active-filter chips at that point.
 */
export async function HomeIndex({
  searchParams: _searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const apps = await listApps({ status: "published" });

  return (
    <article className="bg-[var(--color-canvas)]">
      <div className="bg-[var(--color-night)]">
        <Container className="py-3 md:py-3.5">
          <h1 className="font-heading text-[14px] leading-tight text-white md:text-[16px]">
            An index of{" "}
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

      <Container className="border-t border-[var(--color-line)] py-10 md:py-12">
        <header className="flex flex-col gap-4 pb-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
            Showing all{" "}
            <span className="num text-[var(--color-ink)]">{apps.length}</span>{" "}
            published products
          </p>
        </header>

        {apps.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {apps.map((app) => (
              <li key={app.slug}>
                <AppCard app={app} />
              </li>
            ))}
          </ul>
        )}
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
      <p className="mt-3 max-w-[40ch] mx-auto text-[15px] text-[var(--color-ink-2)]">
        No products are published yet. Once vendors finish onboarding, their
        listings appear here.
      </p>
    </div>
  );
}
