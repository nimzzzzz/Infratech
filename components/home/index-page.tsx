import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Star } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { SearchBar } from "@/components/browse/search-bar";
import { AppCard } from "@/components/browse/app-card";
import { LetterAvatar } from "@/components/browse/letter-avatar";
import {
  getFeaturedApps,
  listRecentlyAddedApps,
  listApps,
} from "@/lib/queries/apps";
import { listStagesWithCounts } from "@/lib/queries/taxonomy";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Editorial home page.
 *
 *   • Hero — title, search bar, prominent "Browse all N tools" CTA.
 *   • Featured tools — getFeaturedApps()
 *   • Browse by stage — 6 stage cards with descriptive blurbs + counts
 *   • Latest additions — listRecentlyAddedApps()
 *
 * The filter sidebar lives at /browse now, not here. The path from /
 * to /browse must be obvious within ~2 seconds — hence the hero CTA
 * above the fold. (Stage 2 plan Q1.)
 */
export async function HomeIndex() {
  // DB unreachable at build → render the page empty rather than failing
  // the build. ISR will repopulate on the first post-deploy request.
  let featured: Awaited<ReturnType<typeof getFeaturedApps>> = [];
  let recent: Awaited<ReturnType<typeof listRecentlyAddedApps>> = [];
  let stagesWithCounts: Awaited<ReturnType<typeof listStagesWithCounts>> = [];
  let allApps: Awaited<ReturnType<typeof listApps>> = [];
  try {
    [featured, recent, stagesWithCounts, allApps] = await Promise.all([
      getFeaturedApps(8),
      listRecentlyAddedApps(6),
      listStagesWithCounts(),
      listApps({ status: "published" }),
    ]);
  } catch (err) {
    console.warn("[home] DB unreachable; rendering empty:", err);
  }
  const totalCount = allApps.length;

  return (
    <article className="bg-[var(--color-canvas)]">
      <HomeJsonLd totalCount={totalCount} />
      {/* SLIM MASTHEAD */}
      <div className="bg-[var(--color-night)]">
        <Container className="py-3 md:py-3.5">
          <p className="font-heading text-[14px] leading-tight text-white md:text-[16px]">
            An index of{" "}
            <span className="italic text-[var(--color-magenta)]">every</span>{" "}
            <span className="italic text-[var(--color-coral)]">project</span>{" "}
            product.
          </p>
        </Container>
      </div>

      {/* HERO */}
      <section className="bg-[var(--color-canvas)]">
        <Container className="pt-12 pb-10 md:pt-20 md:pb-14">
          <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
            The directory
          </p>
          <h1 className="mt-5 max-w-[18ch] font-heading text-[44px] leading-[1.04] tracking-tight md:text-[64px]">
            Find the right tool for every stage of your project.
          </h1>
          <p className="mt-6 max-w-[58ch] text-[17px] leading-relaxed text-[var(--color-ink-2)] md:text-[18px]">
            An independent reference of project management and infrastructure
            software, organised by lifecycle stage and capability. Curated by
            people who use these tools on real programmes.
          </p>

          <div className="mt-8 max-w-3xl">
            <Suspense fallback={<div className="h-12 bg-[var(--color-surface)]" />}>
              <SearchBar />
            </Suspense>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/browse"
              className="group bloom inline-flex h-12 items-center gap-2 px-5 text-[12px] font-medium uppercase tracking-[0.18em] text-white transition active:translate-y-[1px]"
            >
              Browse all{" "}
              <span className="num">{totalCount}</span>{" "}
              tools
              <ArrowRight
                size={13}
                weight="bold"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/about"
              className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
            >
              How this works
            </Link>
          </div>
        </Container>
      </section>

      {/* BROWSE BY STAGE */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-canvas)] py-14 md:py-20">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
                Browse by stage
              </p>
              <h2 className="mt-3 font-heading text-[28px] leading-[1.05] tracking-tight md:text-[36px]">
                Six stages, every tool grouped where it works.
              </h2>
            </div>
          </div>
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stagesWithCounts.map((s, i) => (
              <li key={s.slug}>
                <Link
                  href={`/stages/${s.slug}`}
                  className="group flex h-full flex-col gap-4 border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 transition-colors hover:border-[var(--color-ink)]/40"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="num text-[12px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="num text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
                      {s.appCount} {s.appCount === 1 ? "tool" : "tools"}
                    </span>
                  </div>
                  <p className="font-heading text-[24px] leading-tight tracking-tight">
                    {s.name}
                  </p>
                  <p className="text-[14px] leading-relaxed text-[var(--color-ink-2)]">
                    {s.shortDescription ?? ""}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors group-hover:text-[var(--color-ink)]">
                    Explore
                    <ArrowRight
                      size={11}
                      weight="bold"
                      className="transition-transform duration-300 group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* FEATURED — only render if we have any */}
      {featured.length > 0 ? (
        <section className="border-t border-[var(--color-line)] bg-[var(--color-canvas)] py-14 md:py-20">
          <Container>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
                  <Star size={11} weight="fill" />
                  Featured
                </p>
                <h2 className="mt-3 font-heading text-[28px] leading-[1.05] tracking-tight md:text-[36px]">
                  Editor&rsquo;s picks.
                </h2>
              </div>
              <Link
                href="/browse?sort=featured"
                className="group hidden items-center gap-1.5 self-end text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)] sm:inline-flex"
              >
                See all featured
                <ArrowUpRight
                  size={11}
                  weight="bold"
                  className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featured.map((app) => (
                <li key={app.slug}>
                  <AppCard app={app} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* LATEST ADDITIONS */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-canvas)] py-14 md:py-20">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
                Just added
              </p>
              <h2 className="mt-3 font-heading text-[28px] leading-[1.05] tracking-tight md:text-[36px]">
                Newest in the index.
              </h2>
            </div>
            <Link
              href="/browse?sort=recent"
              className="group hidden items-center gap-1.5 self-end text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)] sm:inline-flex"
            >
              See all
              <ArrowUpRight
                size={11}
                weight="bold"
                className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          <ul className="mt-8 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            {recent.map((app) => (
              <li key={app.slug}>
                <Link
                  href={`/apps/${app.slug}`}
                  className="grid items-center gap-4 py-5 transition-colors hover:bg-[var(--color-surface)] md:grid-cols-[auto_minmax(0,1fr)_minmax(0,2fr)_auto] md:gap-6 md:px-3"
                >
                  <LetterAvatar name={app.name} className="h-10 w-10" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-coral)]">
                      {app.vendor.name}
                    </p>
                    <p className="font-heading text-[20px] leading-tight">
                      {app.name}
                    </p>
                  </div>
                  <p className="hidden truncate text-[14px] text-[var(--color-ink-2)] md:block">
                    {app.tagline}
                  </p>
                  <ArrowUpRight
                    size={16}
                    weight="regular"
                    className="text-[var(--color-ink-3)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* FOOTER CTA */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-canvas-warm)]/50 py-14 md:py-20">
        <Container>
          <div className="md:max-w-[60ch]">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
              The full index
            </p>
            <h2 className="mt-3 font-heading text-[28px] leading-[1.05] tracking-tight md:text-[36px]">
              Browse all{" "}
              <span className="num">{totalCount}</span> tools, filterable
              by stage, capability, industry, and pricing.
            </h2>
            <Link
              href="/browse"
              className="group bloom mt-6 inline-flex h-12 items-center gap-2 px-5 text-[12px] font-medium uppercase tracking-[0.18em] text-white transition active:translate-y-[1px]"
            >
              Open the full directory
              <ArrowRight
                size={13}
                weight="bold"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </Container>
      </section>
    </article>
  );
}

function HomeJsonLd({ totalCount }: { totalCount: number }) {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "InfraTechDB",
    url: SITE_URL,
    description:
      "An independent reference of project management and infrastructure software, organised by stage, capability, and industry.",
    knowsAbout: `Tracks ${totalCount} project management & infrastructure software products across the lifecycle.`,
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "InfraTechDB",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/browse?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
