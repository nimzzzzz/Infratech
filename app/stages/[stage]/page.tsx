import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { InnerHero } from "@/components/site/inner-hero";
import { listStages, getStageBySlug } from "@/lib/queries/taxonomy";
import { listAppsByStage } from "@/lib/queries/apps";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const stages = await listStages();
    return stages.map((s) => ({ stage: s.slug }));
  } catch (err) {
    console.warn("[stages/[stage]] generateStaticParams skipped:", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stage: string }>;
}): Promise<Metadata> {
  const { stage } = await params;
  const found = await getStageBySlug(stage);
  if (!found) return { title: "Stage not found" };
  const description =
    found.shortDescription ??
    `Project management and infrastructure software used during the ${found.name.toLowerCase()} stage of a project.`;
  return {
    title: `${found.name} — Directory of construction & infrastructure tools`,
    description,
    alternates: { canonical: `/stages/${found.slug}` },
    openGraph: {
      title: `${found.name} software — InfraTechDB`,
      description,
      url: `${SITE_URL}/stages/${found.slug}`,
      type: "website",
    },
  };
}

export default async function StagePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = await params;
  const data = await getStageBySlug(stage);
  if (!data) notFound();

  const apps = await listAppsByStage(data.slug);
  const introParagraphs = (data.introMd ?? "")
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  return (
    <>
      <InnerHero
        eyebrow={`Stage ${String(data.position + 1).padStart(2, "0")} · ${data.name}`}
        title={
          <>
            {data.name}{" "}
            <span className="text-[var(--color-ink-3)]">software.</span>
          </>
        }
        body={
          <p>
            {data.shortDescription ?? ""} &mdash; the products teams reach for
            in this phase.
          </p>
        }
      />

      <JsonLd stage={data} apps={apps} />

      {/* Intro paragraphs from intro_md */}
      {introParagraphs.length > 0 ? (
        <section className="bg-[var(--color-canvas)] py-10 md:py-14">
          <Container>
            <div className="md:max-w-[68ch] space-y-5 text-[16px] leading-relaxed text-[var(--color-ink)] md:text-[17px]">
              {introParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* Tools */}
      <section className="bg-[var(--color-canvas)] pb-24 md:pb-32">
        <Container>
          <header className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--color-line-strong)] pb-3">
            <h2 className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-2)]">
              Tools in this stage{" "}
              <span className="num text-[var(--color-ink-3)]">
                ({apps.length})
              </span>
            </h2>
            <Link
              href={`/browse?stage=${data.slug}`}
              className="group inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
            >
              Open in browser
              <ArrowRight
                size={11}
                weight="bold"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </header>

          {apps.length === 0 ? (
            <p className="text-[16px] text-[var(--color-ink-2)]">
              No tools catalogued in this stage yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
              {apps.map((app) => (
                <li key={app.slug}>
                  <Link
                    href={`/apps/${app.slug}`}
                    className="group grid items-center gap-6 py-7 transition-colors hover:bg-[var(--color-surface)] md:grid-cols-[1fr_2fr_auto] md:px-4"
                  >
                    <div>
                      <p className="text-[12px] uppercase tracking-[0.16em] text-[var(--color-ink-3)]">
                        {app.vendor.name}
                      </p>
                      <p className="font-heading text-[22px] leading-tight">
                        {app.name}
                      </p>
                    </div>
                    <p className="max-w-[60ch] text-[15px] leading-relaxed text-[var(--color-ink-2)]">
                      {app.tagline}
                    </p>
                    <ArrowUpRight
                      size={20}
                      weight="regular"
                      className="text-[var(--color-ink-3)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-ink)]"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>
    </>
  );
}

function JsonLd({
  stage,
  apps,
}: {
  stage: { slug: string; name: string; shortDescription: string | null };
  apps: { slug: string; name: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${stage.name} software — InfraTechDB`,
    description: stage.shortDescription ?? undefined,
    url: `${SITE_URL}/stages/${stage.slug}`,
    isPartOf: {
      "@type": "WebSite",
      name: "InfraTechDB",
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: apps.length,
      itemListElement: apps.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/apps/${a.slug}`,
        name: a.name,
      })),
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
