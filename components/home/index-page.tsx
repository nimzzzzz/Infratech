import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { SearchBar } from "@/components/browse/search-bar";
import { StageQuickFilter } from "@/components/browse/stage-quick-filter";
import { AppCard } from "@/components/browse/app-card";
import { listApps } from "@/lib/queries/apps";

/**
 * Stage 2 transitional shape — sidebar removed (it lives on /browse now).
 * The full editorial homepage redesign with featured / latest / browse-by-
 * stage sections lands in the next commit. This commit keeps the page
 * functional and points everyone to /browse for the working filter view.
 */
export async function HomeIndex() {
  const allApps = await listApps({ status: "published" });

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
          <div className="mt-6">
            <Link
              href="/browse"
              className="group inline-flex items-center gap-2 bg-[var(--color-coral)] px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.18em] text-white transition active:translate-y-[1px]"
            >
              Browse all {allApps.length} tools
              <ArrowRight
                size={12}
                weight="bold"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </Container>
      </section>

      <Container className="border-t border-[var(--color-line)] py-10 md:py-12">
        <header className="pb-6">
          <p className="text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
            All <span className="num text-[var(--color-ink)]">{allApps.length}</span>{" "}
            published products
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {allApps.map((app) => (
            <li key={app.slug}>
              <AppCard app={app} />
            </li>
          ))}
        </ul>
      </Container>
    </article>
  );
}
