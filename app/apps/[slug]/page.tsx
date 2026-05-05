import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  ChatCircleText,
  Buildings,
  Calendar,
  Tag,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { LetterAvatar } from "@/components/browse/letter-avatar";
import { AppCard } from "@/components/browse/app-card";
import { apps, type App } from "@/lib/data/apps";
import { stages, stageNameMap } from "@/lib/data/stages";
import { lookups } from "@/lib/data/taxonomy";
import { cn } from "@/lib/utils";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateStaticParams() {
  return apps.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const app = apps.find((a) => a.slug === slug);
  if (!app) return { title: "App not found" };
  return {
    title: `${app.name} — ${app.vendor}`,
    description: app.blurb,
    alternates: { canonical: `/apps/${app.slug}` },
    openGraph: {
      title: `${app.name} — ${app.vendor}`,
      description: app.blurb,
      url: `${SITE_URL}/apps/${app.slug}`,
      type: "website",
    },
  };
}

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = apps.find((a) => a.slug === slug);
  if (!app) notFound();

  const related = relatedApps(app);
  const paragraphs = app.description
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  return (
    <article className="bg-[var(--color-canvas)]">
      <JsonLd app={app} />

      {/* HERO */}
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

          {/* LOGO BANNER — full-width hero panel above the title.
              Real vendor-uploaded logos drop in here at this scale in Phase 2. */}
          <div className="mt-8 flex h-[200px] items-center justify-center overflow-hidden border border-[var(--color-line-strong)] bg-[var(--color-canvas-warm)] md:h-[260px]">
            <LetterAvatar
              name={app.name}
              className="h-24 w-24 md:h-32 md:w-32"
              letterClassName="text-[56px] md:text-[72px]"
            />
          </div>

          <div className="mt-10 grid gap-10 md:grid-cols-[7fr_5fr] md:gap-14">
            {/* Title block */}
            <div className="flex flex-col">
              <Link
                href={`/vendors/${app.vendorSlug}`}
                className="group inline-flex items-center gap-1 self-start text-[12px] uppercase tracking-[0.22em] text-[var(--color-coral)] underline-offset-4 transition-colors hover:underline"
              >
                <span>{app.vendor}</span>
                <ArrowUpRight
                  size={11}
                  weight="bold"
                  className="opacity-60 transition-opacity group-hover:opacity-100"
                />
              </Link>
              <h1 className="mt-3 font-heading text-[44px] leading-[1.02] tracking-tight md:text-[64px]">
                {app.name}
              </h1>
              <p className="mt-6 max-w-[60ch] text-[18px] leading-relaxed text-[var(--color-ink-2)] md:text-[19px]">
                {app.blurb}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={app.websiteUrl}
                  target="_blank"
                  rel="nofollow noopener"
                  className="group relative inline-flex h-12 items-center gap-2 overflow-hidden bg-[var(--color-coral)] px-5 text-[12px] font-medium uppercase tracking-[0.2em] text-white transition-transform active:translate-y-[1px]"
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
                  className="group inline-flex h-12 items-center gap-2 border border-[var(--color-line-strong)] bg-transparent px-5 text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)]"
                >
                  <ChatCircleText size={13} weight="regular" />
                  <span>Contact vendor</span>
                </Link>
              </div>
            </div>

            {/* Facts panel */}
            <aside className="border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 md:p-8">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
                At a glance
              </p>
              <dl className="mt-5 space-y-4">
                <FactRow
                  icon={Calendar}
                  label="Founded"
                  value={<span className="num">{app.founded}</span>}
                />
                <FactRow
                  icon={Tag}
                  label="Pricing model"
                  value={lookups.pricing.get(app.pricing) ?? app.pricing}
                />
                <FactRow
                  icon={Buildings}
                  label="Vendor"
                  value={
                    <Link
                      href={`/vendors/${app.vendorSlug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {app.vendor}
                    </Link>
                  }
                />
              </dl>
              {app.featured ? (
                <div className="mt-6 border-t border-[var(--color-line)] pt-5 text-[12px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
                  Editor&rsquo;s pick
                </div>
              ) : null}
            </aside>
          </div>
        </Container>
      </section>

      {/* BODY */}
      <Container className="py-14 md:py-20">
        <div className="space-y-12 md:max-w-[60ch]">
          {/* What it does — strictly tool-focused; company narrative lives on /vendors/[slug] */}
          <Section eyebrow="What it does">
            <div className="space-y-5 text-[17px] leading-relaxed text-[var(--color-ink)] md:text-[18px]">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <p className="mt-6 text-[13px] text-[var(--color-ink-3)]">
              For {app.vendor}&rsquo;s company background and other listings,{" "}
              <Link
                href={`/vendors/${app.vendorSlug}`}
                className="underline underline-offset-4 hover:text-[var(--color-ink)]"
              >
                see the vendor profile
              </Link>
              .
            </p>
          </Section>

          {/* Lifecycle fit — visual */}
          <Section eyebrow="Lifecycle fit">
            <p className="text-[16px] leading-relaxed text-[var(--color-ink-2)]">
              Where {app.name} actively supports work across the project
              lifecycle.
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3">
              {stages.map((stage) => {
                const supported = app.stages.includes(stage.slug);
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
                          "num text-[13px] uppercase tracking-[0.22em]",
                          supported
                            ? "text-[var(--color-coral)]"
                            : "text-[var(--color-ink-3)]",
                        )}
                      >
                        {stage.index}
                      </span>
                      <span
                        className={cn(
                          "text-[17px]",
                          supported
                            ? "font-heading text-[var(--color-ink)]"
                            : "text-[var(--color-ink-3)]",
                        )}
                      >
                        {stage.name}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>

          {/* Capabilities */}
          <Section eyebrow="Capabilities">
            <ul className="flex flex-wrap gap-2">
              {app.capabilities.map((c) => (
                <li key={c}>
                  <Link
                    href={`/capabilities/${c}`}
                    className="inline-flex items-center border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 py-2 text-[15px] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]"
                  >
                    {lookups.capability.get(c) ?? c}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          {/* Industries */}
          <Section eyebrow="Industries">
            <ul className="flex flex-wrap gap-2">
              {app.industries.map((i) => (
                <li key={i}>
                  <span className="inline-flex items-center border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 py-2 text-[15px] text-[var(--color-ink)]">
                    {lookups.industry.get(i) ?? i}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Pricing */}
          <Section eyebrow="Pricing">
            <p className="font-heading text-[28px] leading-tight">
              {lookups.pricing.get(app.pricing) ?? app.pricing}
            </p>
            <p className="mt-3 text-[16px] leading-relaxed text-[var(--color-ink-2)]">
              The directory describes how vendors charge. We don&rsquo;t
              publish actual prices &mdash; those vary by project size, region,
              and procurement vehicle.
            </p>
          </Section>

          {/* Editor's note */}
          {app.editorNote ? (
            <Section eyebrow="Editor's note">
              <blockquote className="border-l-2 border-[var(--color-coral)] pl-5 font-heading text-[20px] italic leading-snug text-[var(--color-ink)] md:text-[24px]">
                &ldquo;{app.editorNote}&rdquo;
              </blockquote>
            </Section>
          ) : null}

          <p className="text-[13px] text-[var(--color-ink-3)]">
            Spotted something out of date?{" "}
            <Link
              href={`/contact?app=${app.slug}`}
              className="underline underline-offset-4 hover:text-[var(--color-ink)]"
            >
              Suggest an edit
            </Link>
            .
          </p>
        </div>
      </Container>

      {/* RELATED */}
      {related.length > 0 ? (
        <section className="border-t border-[var(--color-line)] bg-[var(--color-canvas)] py-16 md:py-24">
          <Container>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
                  More like this
                </p>
                <h2 className="mt-3 font-heading text-[28px] leading-[1.05] tracking-tight md:text-[36px]">
                  Products in adjacent territory.
                </h2>
              </div>
              <Link
                href="/"
                className="group hidden items-center gap-1.5 self-end text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)] sm:inline-flex"
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
    </article>
  );
}

function Breadcrumb({ appName }: { appName: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] uppercase tracking-[0.16em] text-[var(--color-ink-3)]">
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
      <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
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
        <dt className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
          {label}
        </dt>
        <dd className="mt-0.5 text-[15px] text-[var(--color-ink)]">{value}</dd>
      </div>
    </div>
  );
}

function relatedApps(current: App): App[] {
  const sharedScore = (other: App): number => {
    if (other.slug === current.slug) return -1;
    const sharedStages = other.stages.filter((s) =>
      current.stages.includes(s),
    ).length;
    const sharedCaps = other.capabilities.filter((c) =>
      current.capabilities.includes(c),
    ).length;
    if (sharedStages === 0 || sharedCaps === 0) return 0;
    return sharedStages * 2 + sharedCaps;
  };
  return apps
    .map((a) => ({ app: a, score: sharedScore(a) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.app);
}

function JsonLd({ app }: { app: App }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description: app.blurb,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/apps/${app.slug}`,
    publisher: {
      "@type": "Organization",
      name: app.vendor,
      url: app.websiteUrl,
    },
    offers: {
      "@type": "Offer",
      url: app.websiteUrl,
      priceSpecification: {
        "@type": "PriceSpecification",
        description: lookups.pricing.get(app.pricing) ?? app.pricing,
      },
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
