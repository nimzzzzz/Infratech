import Link from "next/link";
import {
  ArrowUpRight,
  ChatCircleText,
  Buildings,
  Calendar,
  Globe,
  MapPin,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { LetterAvatar } from "@/components/browse/letter-avatar";
import { AppCard } from "@/components/browse/app-card";
import {
  type AppDetail,
  type AppCard as AppCardData,
} from "@/lib/queries/apps";
import { formatStageLabel } from "@/lib/stages/format";
import { VideoEmbed } from "@/components/media/video-embed";
import { lookups, regions as REGION_TAXONOMY } from "@/lib/data/taxonomy";
import { cn } from "@/lib/utils";

/**
 * Pure presentational render of a product detail page — hero, body
 * sections (description, video, lifecycle, capabilities, industries,
 * pricing, editor note), screenshots, related products. No data
 * fetching, no server-only APIs, no client-only APIs — usable from
 * both the real /apps/[slug] server page and the (future) product
 * edit page's live preview.
 *
 * Excluded by design (caller's responsibility to render if needed):
 *   - <JsonLd> — needs SITE_URL, only the real page wants it
 *   - <ViewTracker> — analytics, only the real page fires it
 *
 * The preview wrapper will construct a synthetic AppDetail from the
 * wizard's form state + the live vendor row, pass `related={[]}` to
 * skip the related-apps section, and render the rest exactly as it
 * appears in production. Single source of truth, no drift possible.
 */

const GEO_REGION_SLUGS = REGION_TAXONOMY
  .filter((r) => r.slug !== "global")
  .map((r) => r.slug);

export function ProductDetailView({
  app,
  related,
  allStages,
}: {
  app: AppDetail;
  related: AppCardData[];
  /** Full stage list (taxonomy) for the lifecycle-fit grid. Typed
   *  minimally so this module doesn't drag in DB schema types. */
  allStages: { slug: string }[];
}) {
  const paragraphs = (app.description ?? "")
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  const supportedStageSlugs = new Set(app.stages.map((s) => s.slug));

  // "About the vendor" card — Regions row uses the same "All regions"
  // shortcut as the vendor profile page (app/vendors/[slug]/page.tsx)
  // so the two pages stay consistent.
  const vendorAllGeoRegions =
    app.vendorRegionSlugs.length > 0 &&
    GEO_REGION_SLUGS.every((s) => app.vendorRegionSlugs.includes(s));
  const vendorRegionLabel = vendorAllGeoRegions
    ? "All regions"
    : app.vendorRegionSlugs
        .map((s) => lookups.region.get(s) ?? s)
        .join(", ");

  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--color-line)] pt-10 md:pt-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-0 h-[440px] w-[440px] opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at center, rgba(214,51,108,0.16), rgba(249,115,22,0.10) 50%, transparent 75%)",
          }}
        />
        <Container className="relative">
          <Breadcrumb appName={app.name} />

          <div className="mt-8 flex h-[200px] items-center justify-center overflow-hidden border border-[var(--color-line-strong)] bg-[var(--color-canvas-warm)] p-[8px] md:h-[260px]">
            {app.logoUrl ? (
              // Smart scaling — same logic as the browse cards: fits
              // to whichever axis constrains, preserves aspect, never
              // upscales past natural size. 20px padding via the
              // container.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={app.logoUrl}
                alt=""
                className="h-auto max-h-full w-auto max-w-full object-contain"
              />
            ) : (
              <LetterAvatar
                name={app.name}
                className="h-40 w-40 md:h-52 md:w-52"
                letterClassName="text-[100px] md:text-[120px]"
              />
            )}
          </div>

          <div className="mt-10 grid gap-10 md:grid-cols-[7fr_5fr] md:gap-14">
            <div className="flex flex-col">
              <Link
                href={`/vendors/${app.vendor.slug}`}
                className="group inline-flex items-center gap-1 self-start text-[14px] uppercase tracking-[0.22em] text-[var(--color-coral)] underline-offset-4 transition-colors hover:underline"
              >
                <span>{app.vendor.name}</span>
                <ArrowUpRight
                  size={11}
                  weight="bold"
                  className="opacity-60 transition-opacity group-hover:opacity-100"
                />
              </Link>
              <h1 className="mt-3 font-heading text-[48px] leading-[1.02] tracking-tight md:text-[68px]">
                {app.name}
              </h1>
              <p className="mt-6 max-w-[60ch] text-[20px] leading-relaxed text-[var(--color-ink-2)] md:text-[20px]">
                {app.tagline}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={`/api/clicks/${app.id}?to=${encodeURIComponent(app.websiteUrl)}`}
                  target="_blank"
                  rel="nofollow noopener"
                  className="group relative inline-flex h-12 items-center gap-2 overflow-hidden bg-[var(--color-coral)] px-5 text-[14px] uppercase tracking-[0.2em] text-white transition-transform active:translate-y-[1px]"
                >
                  <span className="relative z-10">Visit website</span>
                  <ArrowUpRight
                    size={13}
                    weight="bold"
                    className="relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-[120%] bg-[var(--color-magenta)] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0"
                  />
                </a>
                <Link
                  href={`/apps/${app.slug}/contact`}
                  className="group inline-flex h-12 items-center gap-2 border border-[var(--color-line-strong)] bg-transparent px-5 text-[14px] uppercase tracking-[0.2em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)]"
                >
                  <ChatCircleText size={13} weight="regular" />
                  <span>Contact vendor</span>
                </Link>
              </div>
            </div>

            <aside className="border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 md:p-8">
              <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
                About the vendor
              </p>
              <dl className="mt-5 space-y-4">
                <FactRow
                  icon={Buildings}
                  label="Company"
                  value={app.vendor.name}
                />
                {app.vendor.foundedYear ? (
                  <FactRow
                    icon={Calendar}
                    label="Founded"
                    value={
                      <span className="num">
                        {String(app.vendor.foundedYear)}
                      </span>
                    }
                  />
                ) : null}
                {app.vendor.hqCountry ? (
                  <FactRow
                    icon={MapPin}
                    label="Headquarters"
                    value={app.vendor.hqCountry}
                  />
                ) : null}
                {app.vendorRegionSlugs.length > 0 ? (
                  <FactRow
                    icon={Globe}
                    label="Regions served"
                    value={vendorRegionLabel}
                  />
                ) : null}
              </dl>
            </aside>
          </div>
        </Container>
      </section>

      <Container className="py-14 md:py-20">
        {/* Body block fills the Container at full width — prose has
            no internal cap. The video keeps its max-w-4xl wrapper so
            the 16:9 embed stays viewport-friendly (a 1280px-wide
            video would render ~720px tall, taller than most laptop
            viewports). */}
        <div className="space-y-12">
          <Section eyebrow="What it does">
            <div className="space-y-5 text-[19px] leading-relaxed text-[var(--color-ink)] md:text-[20px]">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <p className="mt-6 text-[15px] text-[var(--color-ink-3)]">
              For {app.vendor.name}&rsquo;s company background and other
              listings,{" "}
              <Link
                href={`/vendors/${app.vendor.slug}`}
                className="underline underline-offset-4 hover:text-[var(--color-ink)]"
              >
                see the vendor profile
              </Link>
              .
            </p>
          </Section>

          {app.videoUrl ? (
            <Section eyebrow="Product video">
              <div className="max-w-4xl">
                <VideoEmbed url={app.videoUrl} />
              </div>
            </Section>
          ) : null}

          <Section eyebrow="Lifecycle fit">
            <p className="text-[18px] leading-relaxed text-[var(--color-ink-2)]">
              Where {app.name} actively supports work across the project
              lifecycle.
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
              {allStages.map((stage) => {
                const supported = supportedStageSlugs.has(stage.slug);
                return (
                  <li key={stage.slug}>
                    <div
                      className={cn(
                        "relative flex flex-col gap-1.5 border px-4 py-4 transition-colors",
                        supported
                          ? "border-[var(--color-coral)] bg-[var(--color-canvas-warm)]"
                          : "border-[var(--color-line)] bg-transparent text-[var(--color-ink-3)]",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[19px]",
                          supported
                            ? "font-heading text-[var(--color-ink)]"
                            : "text-[var(--color-ink-3)]",
                        )}
                      >
                        {formatStageLabel(stage.slug)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section eyebrow="Capabilities">
            <ul className="flex flex-wrap gap-2">
              {app.capabilities.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/capabilities/${c.slug}`}
                    className="inline-flex items-center border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 py-2 text-[17px] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          {app.industries.length > 0 ? (
            <Section eyebrow="Industries">
              <ul className="flex flex-wrap gap-2">
                {app.industries.map((i) => (
                  <li key={i.slug}>
                    <span className="inline-flex items-center border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 py-2 text-[17px] text-[var(--color-ink)]">
                      {i.name}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {app.pricingModels.length > 0 ? (
            <Section eyebrow="Pricing">
              <ul className="flex flex-wrap gap-2">
                {app.pricingModels.map((p) => (
                  <li key={p.slug}>
                    <span className="inline-flex items-center border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 py-2 text-[17px] text-[var(--color-ink)]">
                      {p.name}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {app.editorNote ? (
            <Section eyebrow="Editor's note">
              <blockquote className="border-l-2 border-[var(--color-coral)] pl-5 font-heading text-[22px] italic leading-snug text-[var(--color-ink)] md:text-[26px]">
                &ldquo;{app.editorNote}&rdquo;
              </blockquote>
            </Section>
          ) : null}

        </div>
      </Container>

      {app.screenshots.length > 0 ? (
        <section className="border-t border-[var(--color-line)] bg-[var(--color-canvas)] py-16 md:py-24">
          <Container>
            <p className="text-[13px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
              Screenshots
            </p>
            <h2 className="mt-3 font-heading text-[30px] leading-[1.05] tracking-tight md:text-[40px]">
              {app.name} in use.
            </h2>
            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {app.screenshots.map((shot) => (
                <li key={shot.id}>
                  <a
                    href={shot.url}
                    target="_blank"
                    rel="noopener"
                    className="group relative block aspect-[4/3] overflow-hidden border border-[var(--color-line-strong)] bg-[var(--color-canvas-warm)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shot.url}
                      alt={shot.alt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="border-t border-[var(--color-line)] bg-[var(--color-canvas)] py-16 md:py-24">
          <Container>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-[13px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
                  More like this
                </p>
                <h2 className="mt-3 font-heading text-[30px] leading-[1.05] tracking-tight md:text-[40px]">
                  Products in adjacent territory.
                </h2>
              </div>
              <Link
                href="/"
                className="group hidden items-center gap-1.5 self-end text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)] sm:inline-flex"
              >
                Browse all
                <ArrowUpRight
                  size={11}
                  weight="bold"
                  className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <AppCard app={r} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}
    </>
  );
}

function Breadcrumb({ appName }: { appName: string }) {
  return (
    <div className="flex items-center gap-2 text-[15px] uppercase tracking-[0.16em] text-[var(--color-ink-3)]">
      <Link href="/" className="hover:text-[var(--color-ink)]">
        Index
      </Link>
      <span aria-hidden>/</span>
      <span className="truncate text-[var(--color-ink-2)]">{appName}</span>
    </div>
  );
}

function Section({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-[14px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        {eyebrow}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{
    size?: number;
    weight?: "regular" | "bold" | "fill";
    className?: string;
  }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <Icon
        size={14}
        weight="regular"
        className="mt-0.5 shrink-0 text-[var(--color-ink-3)]"
      />
      <div className="flex min-w-0 flex-col">
        <dt className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
          {label}
        </dt>
        <dd className="mt-0.5 text-[17px] text-[var(--color-ink)]">{value}</dd>
      </div>
    </div>
  );
}
